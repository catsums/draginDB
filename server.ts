import http from "http";
import socketIO from "socket.io";
import express from "express";
import path from "path";

import * as MY from "@catsums/my";
import { SocketClientEvent, SocketEvent } from "./interface";
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
	})
});