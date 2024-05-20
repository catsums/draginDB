import _ from "lodash";
import * as MY from "@catsums/my";

import { 
	IIndex, IDatabase, 
	IObject, IPack, IRecord, 
	JSONDate, JSONType, JSONObject,
	IDType, PathType, DBDataType,
	IDBConnection,
	IResponse,
} from './interface';

interface IRequest {
	type: string;
	key?: string;
	id?: string;
	time: number;
	data?: IObject;
}

type ResponseCallbackType = (err: Error, response?: IResponse) => void;

const DefaultResponseCallback:ResponseCallbackType = (err,res) => {};

async function request(url, req:IRequest) : Promise<IResponse>{
	let res = await fetch(url, {
		body: JSON.stringify(req),
	});

	let obj = await res.json();

	return obj as IResponse;
}

export class DBClient{
	private _id: IDType = "";
	private _key: string = "";

	private _ip: string = "";
	private _url: string = "";
	private _db:string = "";

	private _sync = {
		time: -1,
	}

	constructor(url){
		this._url = url;
	}

	db(){
		return new DBClientDatabase(this._db, this, {
			id: this._id,
			key: this._key,

			ip: this._ip,
			url: this._url,
			sync: this._sync,
		});
	}

	async connect({
		db, url=this._url, username="", password="",
	}:{db:string, url?:string, username?:string, password?:string}){
		let res = await request(url, {
				type: `connect`,
				time: Date.now(),
				data: {
					username,
					password,
					db,
				}
		});

		if(!res.success){
			throw new Error(res.message);
		}

		let data = res.data;

		this._id = data.id;
		this._key = data.key;

		this._ip = data.ip;
		this._sync.time = data.sync.time;

		this._db = db;
	}

	async close(){
		let res = await request(this._url, {
			type: `close`,
			time: Date.now(),
			key: this._key,
			id: this._id,
		});

		if(!res.success){
			throw new Error(res.message);
		}

		this._id = "";
		this._key = "";

		this._ip = "";
		this._db = "";
		this._sync.time = -1;
	}
	
}

export class DBClientDatabase{
	name = "";
	client:DBClient = null;

	private clientData = {
		id:"",
		key:"",
		url:"",
		ip:"",
		sync: {
			time: -1,
		}
	}

	constructor(name:string, client:DBClient, {id,key,ip,sync,url}){
		this.name = name;
		this.client = client;
		this.clientData = {id,key,ip,sync,url};
	}

	async createPack(name:string, callback = DefaultResponseCallback){
		let {id,key,url,ip,sync} = this.clientData;
		
		try{
			let res = await request(url, {
				type: `createPack`,
				id: id,
				key: key,
				time: sync.time,
				data: {
					name: name,
				},
			});

			callback(null, res);

			return res;
		}catch(err){
			callback(err);
			throw err;
		}
	}

	pack(name:string){
		return new DBClientPack(name, this.client, this.clientData);
	}
}

export class DBClientPack{
	name = "";
	client:DBClient = null;

	private clientData = {
		id:"",
		key:"",
		url:"",
		ip:"",
		sync: {
			time: -1,
		}
	}

	constructor(name:string, client:DBClient, {id,key,url,ip,sync}){
		this.name = name;
		this.client = client;
		this.clientData = {id,key,ip,sync,url};
	}

	//CRUD
	public async insert(record:JSONObject, callback?:ResponseCallbackType) : Promise<IResponse>;
	public async insert(records:JSONObject[], callback?:ResponseCallbackType) : Promise<IResponse>;
	async insert(record:JSONObject|JSONObject[], callback = DefaultResponseCallback){
		let {id,key,url,ip,sync} = this.clientData;
		
		let type = _.isArray(record) ? "insertOne" : "insertMany";
		try{
			let res = await request(url, {
				type: type,
				id: id,
				key: key,
				time: sync.time,
				data: record,
			});

			callback(null, res);

			return res;
		}catch(err){
			callback(err);
			throw err;
		}
	}
	async selectOne(query:JSONObject, opts:JSONObject,callback = DefaultResponseCallback){
		let {id,key,url,ip,sync} = this.clientData;
		
		try{
			let res = await request(url, {
				type: `selectOne`,
				id: id,
				key: key,
				time: sync.time,
				data: query,
			});

			callback(null, res);

			return res;
		}catch(err){
			callback(err);
			throw err;
		}
	}
	async select(query:JSONObject, opts:JSONObject, callback = DefaultResponseCallback){
		let {id,key,url,ip,sync} = this.clientData;
		
		try{
			let res = await request(url, {
				type: `selectMany`,
				id: id,
				key: key,
				time: sync.time,
				data: query,
			});

			callback(null, res);

			return res;
		}catch(err){
			callback(err);
			throw err;
		}
	}
	async update(){

	}
	async delete(){

	}
	
}