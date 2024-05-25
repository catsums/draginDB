
import _ from "lodash";
import * as MY from "@catsums/my";
import path from "path";
import fs from "fs";

export interface IObject<T=any> {
	[key:string|number|symbol]: T;
}

export type JSONDate = string | number;

export type JSONType = string | number | boolean | null | JSONType[] | JSONObject | JSONDate;

export type DBDataType = JSONType;

export type IDType = string;
export type PathType = string;

export interface JSONObject {
	[key:string]: JSONType;
}

export interface IDBPath {
	isDBPath: true;
	data: string;
	// Collection.RecordID.Field
}

export class DBToken {
	static hasToken(token:string, str:string){
		return (
			str.startsWith(`$${token}[`) && str.endsWith(`]`)
		)
	}
	static getTokenData(str:string){
		if(str.startsWith("$") && str.endsWith("]") && str.includes("[")){
			let key = str.substring(str.indexOf("$")+1, str.indexOf("["));
			let value = str.substring(str.indexOf("[")+1, str.indexOf("]"));

			return [key, value];
		}
		return null;
	}
	data: any;
	constructor(data:any){
		this.data = data;
	}

	toString(){
		return this.data.toString();
	}

	valueOf(){
		return this.data.valueOf();
	}

	toJSON(){
		return this.data;
	}
}

export class DBPath extends DBToken {
	path:string;
	static token:string = "Path";

	constructor(path:string){
		if(DBToken.hasToken(DBPath.token, path)){
			let [t, p] = DBToken.getTokenData(path) as [string, string];
			path = p;
		}
		super(path);
		this.path = path;
	}

	override toString(){
		return this.path;
	}

	override valueOf(){
		return this.path;
	}

	override toJSON(){
		return this.path;
	}
	
}
export class DBDate extends DBToken{
	date:Date;
	static token:string = "Date";

	constructor(date:string){
		if(DBToken.hasToken(DBPath.token, date)){
			let [t, p] = DBToken.getTokenData(date) as [string, string];
			date = p;
		}
		super(Number(date));
		this.date = new Date(Number(date));
	}

	override toString(){
		return this.date.toString();
	}

	override valueOf(){
		return this.date.getTime();
	}

	override toJSON(){
		return this.date.getTime();
	}
	
}



export interface IRecord {
	$id: IDType;
	[key: string]: DBDataType;
}

export interface IIndex {
	id: IDType;
	field: string;
	records: {
		[key:string]: string[];
	};
}

export interface IPack {
	name: string;
	records: {
		[id:string]: IRecord;
	};
	// indexes: {
	// 	[id:string]: IIndex;
	// },
	details: {
		dateCreated: number;
		dateModified: number;
	};
}

export interface IDatabase {
	name: string;
	packs: {
		[name:string]: IPack;
	};
	path: PathType;
	details: {
		dateCreated: number;
		dateModified: number;
	};
}

export interface IDBConnection {
	id: IDType;
	database: IDType;
	ip: string;
	details: {
		dateCreated: Date;
		dateSynced: Date;
		datePinged: Date;
	}
}

export interface IResponse<T=any> {
	success: boolean;
	message: string;
	data?: T;
	sync?: {
		id: string | number;
		time: number;
	}
}

export enum SocketEvent {
	Connect = "connect",
	Disconnect = "disconnect",
	Open = "open",
	Close = "close",
	Create = "create",
	Read = "read",
	Update = "update",
	Delete = "delete",
}
export enum SocketClientEvent {
	Open = "clientOpen",
	Close = "clientClose",
	CreatePack = "clientCreatePack",
	DeletePack = "clientDeletePack",
	CreateRec = "clientCreateRec",
	ReadRec = "clientReadRec",
	UpdateRec = "clientUpdateRec",
	DeleteRec = "clientDeleteRec",
}

export interface IRequest {
	type: string;
	key?: string;
	id?: string;
	time: number;
	data?: IObject;
}

export type ResponseCallbackType = (err: Error, response?: IResponse) => void;

export const DefaultResponseCallback:ResponseCallbackType = (err,res) => {};

export async function request(url, req:IRequest) : Promise<IResponse>{
	let res = await fetch(url, {
		body: JSON.stringify(req),
	});

	let obj = await res.json();

	return obj as IResponse;
}