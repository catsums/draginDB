import http from "http";
import socketIO from "socket.io";
import express from "express";
import path from "path";

import * as MY from "@catsums/my";
import { IRecord, SocketClientEvent, SocketEvent } from "./interface";
import { DBDatabase } from "./database";

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 8090;

server.listen(PORT, () => {
	console.log(`Listening on Port: ${PORT}`);
});

const { Server, Socket } = socketIO;
const io = new Server(server);

interface IClientData {
	socket: socketIO.Socket;
	id: string;
	key: string;
	ip: string;
	db: DBDatabase;
}

const clients = new Map<string, IClientData>();

const DBFolderPath = `./db/`;

io.on('connection', (socket) => {
	let client:IClientData = {
		id: MY.randomID(`C-`),
		key: MY.randomID(),
		ip: socket.handshake.address,
		db: null,
		socket: socket,
	}

	clients.set(client.id, client);
	
	console.log(`Client ${client.id} connected`);
	
	socket
	.on(SocketClientEvent.Open, async (str:string) => {
		try{
			let res = JSON.parse(str);

			let db = await DBDatabase.ReadDatabase(path.resolve(`${res.db}.json`, DBFolderPath));

			client.db = db;

			socket.emit(SocketEvent.Open, JSON.stringify({
				id: client.id,
				key: client.key,
				ip: client.ip,
				db: db.name,
				sync: {
					time: Date.now(),
					id: res.sync.id,
				},
			}));
		}catch(err){

			socket.disconnect(true);

			socket.emit(SocketEvent.Open, JSON.stringify({
				success: false, message: err.message,
			}));
		}
	}).on(SocketClientEvent.Close, async (str:string) => {
		console.log(`Client ${client.id} disconnected`);
		socket.disconnect(true);
	});

	socket.on(SocketClientEvent.CreatePack, async (str:string) => {
		try{
			let res = JSON.parse(str);

			let db = client.db;
			if(res.data.db != db.name){
				db = await DBDatabase.ReadDatabase(path.resolve(`${res.db}.json`, DBFolderPath));
				client.db = db;
			}

			let pack = db.createPack(res.data.name);

			socket.emit(SocketEvent.Create, JSON.stringify({
				success: true,
				message: `Created Pack`,
				data: {
					name: pack.name,
				},
				sync: {
					time: Date.now(),
					id: res.sync.id,
				},
			}));
		}catch(err){
			socket.emit(SocketEvent.Create, JSON.stringify({
				success: false, message: err.message,
			}));
		}
	}).on(SocketClientEvent.DeletePack, async (str:string) => {
		try{
			let res = JSON.parse(str);

			let db = client.db;
			if(res.data.db != db.name){
				db = await DBDatabase.ReadDatabase(path.resolve(`${res.db}.json`, DBFolderPath));
				client.db = db;
			}

			let pack = db.deletePack(res.data.name);

			socket.emit(SocketEvent.Delete, JSON.stringify({
				success: true,
				message: `Deleted Pack`,
				data: {
					name: pack.name,
				},
				sync: {
					time: Date.now(),
					id: res.sync.id,
				},
			}));
		}catch(err){
			socket.emit(SocketEvent.Create, JSON.stringify({
				success: false, message: err.message,
			}));
		}
	}).on(SocketClientEvent.CreateRec, async (str:string) => {
		try{
			let res = JSON.parse(str);

			let db = client.db;
			if(res.data.db != db.name){
				db = await DBDatabase.ReadDatabase(path.resolve(`${res.db}.json`, DBFolderPath));
				client.db = db;
			}

			let pack = db.getPackByName(res.data.pack);

			let rec = pack.createRecord(res.data.record);

			socket.emit(SocketEvent.Create, JSON.stringify({
				success: true,
				message: `Created Rec`,
				data: {
					recordID: rec.$id,
				},
				sync: {
					time: Date.now(),
					id: res.sync.id,
				},
			}));
		}catch(err){
			socket.emit(SocketEvent.Create, JSON.stringify({
				success: false, message: err.message,
			}));
		}
	}).on(SocketClientEvent.ReadRec, async (str:string) => {
		try{
			let res = JSON.parse(str);

			let db = client.db;
			if(res.data.db != db.name){
				db = await DBDatabase.ReadDatabase(path.resolve(`${res.db}.json`, DBFolderPath));
				client.db = db;
			}

			let pack = db.getPackByName(res.data.pack);
			let query = res.data.query;
			let opts = res.data.options;

			let records:IRecord[] = [];
			let queryKeys = Object.keys(query);
			for(let record of Object.values(pack.records)){
				let checks = 0;
				for(let key of queryKeys){
					let val = query[key];
					if(record[key] == val){
						checks++;
					}
				}
				if(checks >= queryKeys.length){
					records.push(record);
				}
			}

			socket.emit(SocketEvent.Read, JSON.stringify({
				success: true,
				message: `Retrieved Record`,
				data: {
					records: records,
				},
				sync: {
					time: Date.now(),
					id: res.sync.id,
				},
			}));
		}catch(err){
			socket.emit(SocketEvent.Read, JSON.stringify({
				success: false, message: err.message,
			}));
		}
	})
});