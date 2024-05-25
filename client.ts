import _, { set } from "lodash";
import * as MY from "@catsums/my";

import { io, Socket } from "socket.io-client";

import { 
	IIndex, IDatabase, 
	IObject, IPack, IRecord, 
	JSONDate, JSONType, JSONObject,
	IDType, PathType, DBDataType,
	IDBConnection,
	IResponse,
	SocketClientEvent, SocketEvent, DefaultResponseCallback,
} from './interface';

function verifySync(idA, idB){
	return (idA === idB);
}

export class DBClient{
	private _id: IDType = "";
	private _key: string = "";

	private _ip: string = "";
	private _url: string = "";
	private _db:string = "";

	private socket:Socket;

	private _sync = {
		time: -1,
	}

	get id(){ return this._id; }
	get key(){ return this._key; }
	get url(){ return this._url; }
	get dbName(){ return this._db; }
	get ip(){ return this._ip; }

	get syncTime(){ return this._sync.time; }
	get clientSocket(){ return this.socket; }

	constructor(url){
		this._url = url;
	}

	db(name = this.dbName){
		return new DBClientDatabase(name, this);
	}

	connect({
		db, url=this._url, username="", password="",
	}:{db:string, url?:string, username?:string, password?:string}, callback = DefaultResponseCallback){
		let setData = ({id, key, ip, sync, db, socket}) => {
			this._id = id;
			this._key = key;
			this._ip = ip;
			this._sync.time = sync.time;
			this._db = db;
			this.socket = socket;
		}

		return new Promise((resolve, reject) => {
			let socket:Socket;
			let sync = {
				time: Date.now(),
				id: MY.randomID(),
			}
			function onConnect(){
				socket.emit(SocketClientEvent.Open, JSON.stringify({
					username, password, db,
					sync,
				}));
			}

			function onOpen(str:string){
				try{
					let res = JSON.parse(str);
					if(!res.success){
						throw new Error(res.message);
					}
					if(!verifySync(res.sync?.id, sync.id)){
						//handle collision
						return;
					}
			
					let data = res.data;
	
					setData({
						id: data.id,
						key: data.key,
						db: data.db,
						ip: data.ip,
						sync: data.sync,
						socket,
					});

					callback(null, this);
					resolve(this);
				}catch(err){
					callback(err);
					reject(err);
				}
			}

			function onDisconnect(){
				setData({
					id:"", key:"", db:"", ip:"", sync:{time:-1}, socket,
				});
			}

			try{
				socket = io(`${url}`);

				socket
				.on(SocketEvent.Connect, onConnect)
				.on(SocketEvent.Open, onOpen)
				.on(SocketEvent.Disconnect, onDisconnect)

			}catch(err){
				callback(err);
				reject(err);
			}
		});


	}

	close(callback = DefaultResponseCallback){
		let socket = this.socket;
		return new Promise((resolve, reject) => {
			let sync = {
				time: Date.now(),
				id: MY.randomID(),
			}
			function onClose(str:string){
				try{
					let res = JSON.parse(str);

					if(!verifySync(res.sync?.id, sync.id)){
						//handle collision
						return;
					}

					callback(null, res);
					resolve(res);
				}catch(err){
					callback(err);
					reject(err);
				}
			}

			try{
				socket
				.emit(SocketClientEvent.Close, JSON.stringify({
					id: this._id, key: this._key,
					sync,
				}))
				.on(SocketEvent.Disconnect, onClose);
			}catch(err){
				callback(err);
				reject(err);
			}
		});
	}
	
}

export class DBClientDatabase{
	name = "";
	client:DBClient = null;

	constructor(name:string, client:DBClient){
		this.name = name;
		this.client = client;
	}

	createPack(name:string, callback = DefaultResponseCallback){
		let socket = this.client.clientSocket;

		return new Promise((resolve, reject) => {

			let sync = {
				time: Date.now(),
				id: MY.randomID(),
			}

			function onCreatePack(str:string){
				try{
					let res = JSON.parse(str);
					if(!res.success){
						throw new Error(res.message);
					}

					if(!verifySync(res.sync?.id, sync.id)){
						//handle collision
						return;
					}
	
					let data = res.data;
					socket.off(SocketEvent.Create, onCreatePack)
	
					callback(null, data);
					resolve(data);
				}catch(err){
					callback(err);
					reject(err);
				}
			}

			try{
				socket.emit(SocketClientEvent.CreatePack, JSON.stringify({
					id: this.client.id, key: this.client.key,
					data: {
						name: name,
						db: this.client.dbName,
					},
					sync,
				}));

				socket.on(SocketEvent.Create, onCreatePack);
			}catch(err){
				callback(err);
				reject(err);
			}
		});
	}

	deletePack(name:string, callback = DefaultResponseCallback){
		let socket = this.client.clientSocket;

		return new Promise((resolve, reject) => {

			let sync = {
				time: Date.now(),
				id: MY.randomID(),
			}

			function onDeletePack(str:string){
				try{
					let res = JSON.parse(str);
					if(!res.success){
						throw new Error(res.message);
					}

					if(!verifySync(res.sync?.id, sync.id)){
						//handle collision
						return;
					}
	
					let data = res.data;
					socket.off(SocketEvent.Delete, onDeletePack)
	
					callback(null, data);
					resolve(data);
				}catch(err){
					callback(err);
					reject(err);
				}
			}

			try{
				socket.emit(SocketClientEvent.DeletePack, JSON.stringify({
					id: this.client.id, key: this.client.key,
					data: {
						name: name,
						db: this.client.dbName,
					},
					sync,
				}));

				socket.on(SocketEvent.Delete, onDeletePack);
			}catch(err){
				callback(err);
				reject(err);
			}
		});
	}

	pack(name:string){
		return new DBClientPack(name, this);
	}
}

export class DBClientPack{
	name = "";
	db:DBClientDatabase = null;

	get client(){
		if(!this.db) return null;
		return this.db.client;
	}

	constructor(name:string, db:DBClientDatabase){
		this.name = name;
		this.db = db;
	}

	//CRUD
	create(record:JSONObject|JSONObject[], callback = DefaultResponseCallback){
		let socket = this.client.clientSocket;
		let pack = this;

		return new Promise((resolve, reject) => {
			let sync = {
				time: Date.now(),
				id: MY.randomID(),
			}
			function onCreate(str:string){
				try{
					let res = JSON.parse(str);
					if(!res.success){
						throw new Error(res.message);
					}
					if(!verifySync(res.sync?.id, sync.id)){
						//handle collision
						return;
					}

					let data = res.data;
					socket.off(SocketEvent.Create, onCreate);

					callback(null, data);
					resolve(data);
				}catch(err){
					callback(err);
					reject(err);
				}
			}

			try{
				socket.emit(SocketClientEvent.CreateRec, JSON.stringify({
					id: this.client.id, key: this.client.key,
					data: {
						pack: pack.name,
						record:record,
					},
					sync,
				}));

				socket.on(SocketEvent.Create, onCreate);
			}catch (err) {
				callback(err);
				reject(err);
			}
		});
	}
	read(query:JSONObject, opts:JSONObject, callback = DefaultResponseCallback){
		let socket = this.client.clientSocket;
		let pack = this;

		return new Promise((resolve, reject) => {
			let sync = {
				time: Date.now(),
				id: MY.randomID(),
			}

			function onRead(str:string){
				try{
					let res = JSON.parse(str);
					if(!res.success){
						throw new Error(res.message);
					}
					if(!verifySync(res.sync?.id, sync.id)){
						//handle collision
						return;
					}

					let data = res.data;
					socket.off(SocketEvent.Read, onRead);

					callback(null, data);
					resolve(data);
				}catch(err){
					callback(err);
					reject(err);
				}
			}

			try{
				socket.emit(SocketClientEvent.ReadRec, JSON.stringify({
					id: this.client.id, key: this.client.key,
					data: {
						pack: pack.name,
						query,
						options: opts,
					},
					sync,
				}));

				socket.on(SocketEvent.Read, onRead);
			}catch (err) {
				callback(err);
				reject(err);
			}
		});
	}
	update(query:JSONObject, opts:JSONObject, callback = DefaultResponseCallback){
		let socket = this.client.clientSocket;
		let pack = this;

		return new Promise((resolve, reject) => {
			let sync = {
				time: Date.now(),
				id: MY.randomID(),
			}

			function onUpdate(str:string){
				try{
					let res = JSON.parse(str);
					if(!res.success){
						throw new Error(res.message);
					}
					if(!verifySync(res.sync?.id, sync.id)){
						//handle collision
						return;
					}

					let data = res.data;
					socket.off(SocketEvent.Update, onUpdate);

					callback(null, data);
					resolve(data);
				}catch(err){
					callback(err);
					reject(err);
				}
			}

			try{
				socket.emit(SocketClientEvent.UpdateRec, JSON.stringify({
					id: this.client.id, key: this.client.key,
					data: {
						pack: pack.name,
						query, options: opts,
					},
					sync,
				}));

				socket.on(SocketEvent.Update, onUpdate);
			}catch (err) {
				callback(err);
				reject(err);
			}
		});
	}
	delete(query:JSONObject, opts:JSONObject, callback = DefaultResponseCallback){
		let socket = this.client.clientSocket;
		let pack = this;

		return new Promise((resolve, reject) => {
			let sync = {
				time: Date.now(),
				id: MY.randomID(),
			}

			function onDelete(str:string){
				try{
					let res = JSON.parse(str);
					if(!res.success){
						throw new Error(res.message);
					}
					if(!verifySync(res.sync?.id, sync.id)){
						//handle collision
						return;
					}

					let data = res.data;
					socket.off(SocketEvent.Delete, onDelete);

					callback(null, data);
					resolve(data);
				}catch(err){
					callback(err);
					reject(err);
				}
			}

			try{
				socket.emit(SocketClientEvent.DeleteRec, JSON.stringify({
					id: this.client.id, key: this.client.key,
					data: {
						pack: pack.name,
						query, options: opts,
					},
					sync,
				}));

				socket.on(SocketEvent.Delete, onDelete);
			}catch (err) {
				callback(err);
				reject(err);
			}
		});
	}
	
}