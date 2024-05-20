
import _ from "lodash";
import MY from "@catsums/my";

interface IObject<T=any> {
	[key:string|number|symbol]: T;
}

type JSONDate = string | number;

type JSONType = string | number | boolean | null | JSONType[] | JSONObject | JSONDate;

type DBDataType = JSONType;

type IDType = string;
type PathType = string;

let arr:JSONType = [];

interface JSONObject {
	[key:string]: JSONType;
}

interface IDBPath {
	isDBPath: true;
	data: string;
	// Collection.RecordID.Field
}

class DBToken {
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
}

class DBPath extends DBToken {
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

	toString(){
		return this.path;
	}

	valueOf(){
		return this.path;
	}

	toJSON(){
		return this.path;
	}
	
}
class DBDate extends DBToken{
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

	toString(){
		return this.date.toString();
	}

	valueOf(){
		return this.date.getTime();
	}

	toJSON(){
		return this.date.getTime();
	}
	
}



interface IRecord {
	$id: IDType;
	[key: string]: DBDataType;
}

interface IIndex {
	id: IDType;
	field: string;
	records: {
		[key:string]: string[];
	};
}

interface IPack {
	name: string;
	records: {
		[id:string]: IRecord;
	};
	indexes: {
		[id:string]: IIndex;
	},
	details: {
		dateCreated: number;
		dateModified: number;
	};
}

interface IDatabase {
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

class DBIndex implements IIndex {
	id = MY.randomID("Index-");
	field = "";
	records:IObject<string[]> = {};

	public constructor(field:string);
	public constructor(obj:IIndex);

	constructor(data:string|IIndex){
		if(_.isString(data)) {
			this.field = data;
		}else if(_.isObject(data)){
			this.parseJSON(data);
		}
	}

	processPack(pack:IPack) {
		let recordIDs:IObject<string[]> = {};

		for(let [id,record] of Object.entries(pack.records)) {
			if(!record) return;
			if(!record[this.field]) return;

			let fieldValue = record[this.field]?.toString() || "";
			let recordID = record.$id;

			let set = recordIDs[fieldValue];

			if(!set){
				recordIDs[fieldValue] = [];
				set = recordIDs[fieldValue];
			}

			set.push(recordID);
			
		}

		this.records = recordIDs;
	}

	parseJSON(obj: IIndex){
		if(_.isString(obj.id)){
			this.id = obj.id;
		}
		if(_.isString(obj.field)){
			this.field = obj.field;
		}
		if(_.isObject(obj.records)){
			let records = _.clone(obj.records);
			for(let [name, recordIDs] of Object.entries(records)){
				this.records[name] = _.clone(recordIDs);
			}
		}
	}

	toJSON() : IIndex{
		return {
			id: this.id,
			field: this.field,
			records: _.clone(this.records),
		}
	}
}

class DBPack implements IPack {
	private static RecordIDPrefix = `Rec-`;
	name = "";
	records:IObject<IRecord> = {};
	indexes:IObject<DBIndex> = {};
	details = {
		dateCreated: Date.now(),
		dateModified: Date.now(),
	};

	public constructor(name: string);
	public constructor(obj: IPack);
	constructor(...args) {
		if(_.isString(args[0])) {
			let [name] = args;
			this.name = name;
		}else if(_.isObject(args[0])){
			let obj = args[0] as IPack;

			this.parseJSON(obj);
		}
	}

	createIndex(field: string){
		let index = new DBIndex(field);

		index.processPack(this);

		delete this.indexes[field];
		this.indexes[field] = index;
	}

	public createRecord(jsonStr:string) : IRecord;
	public createRecord(jsonObj:IRecord) : IRecord;
	createRecord(data: string|IRecord){
		let obj;
		if(_.isString(data)) {
			try{
				obj = JSON.parse(data);
			}catch(err){
				throw err;
			}
		}else{
			obj = data;
		}

		let recordID = MY.randomID(DBPack.RecordIDPrefix);
		obj.$id = recordID;

		this.records[recordID] = obj;

		return this.records[recordID];
	}

	public getRecord(id:string) : IRecord|null;
	public getRecord(field:string, val:any) : IRecord|null;
	getRecord(...args){
		if(args.length > 1){
			let [field, val] = args;

			for(let record of Object.values(this.records)){
				if(record[field] == val){
					return record;
				}
			}
		}else{
			let [id] = args;
			if(this.records.hasOwnProperty(id)){
				return this.records[id];
			}
		}
		return null;
	}

	public deleteRecord(id:string) : IRecord|null;
	public deleteRecord(field:string, val:any) : IRecord|null;
	deleteRecord(...args){
		if(args.length > 1){
			let [field, val] = args;

			for(let record of Object.values(this.records)){
				if(record[field] == val){
					let recordID = record.$id;
					delete this.records[recordID];
					return record;
				}
			}
		}else{
			let [id] = args;
			if(this.records.hasOwnProperty(id)){
				let record = this.records[id];
				delete this.records[id];
				return record;
			}
		}
		return null;
	}

	parseJSON(obj: IPack){
		if(_.isString(obj.name)){
			this.name = obj.name;
		}
		if(_.isObject(obj.records)){
			let records = _.clone(obj.records);
			for(let [name, record] of Object.entries(records)){
				this.records[name] = _.clone(record);
			}
		}
		if(_.isObject(obj.indexes)){
			let indexes = _.clone(obj.indexes);
			for(let [name, index] of Object.entries(indexes)){
				this.indexes[name] = new DBIndex(index);
			}
		}
		if(_.isObject(obj.details)){
			this.details.dateCreated = obj.details.dateCreated;
			this.details.dateModified = obj.details.dateModified;
		}

	}

	toJSON() : IPack{
		let jsonObj = {
			name: this.name,
			records: _.clone(this.records),
			indexes: {},
			details: _.clone(this.details),
		}

		for(let [id, index] of Object.entries(this.indexes)){
			jsonObj.indexes[id] = index.toJSON();
		}

		return jsonObj;
	}
}

class Database implements IDatabase {
	name = "";
	packs:IObject<DBPack> = {};
	path: PathType;
	details = {
		dateCreated: Date.now(),
		dateModified: Date.now(),
	}

	public constructor(name:string, path:string);
	public constructor(jsonStr:string);
	public constructor(obj:IDatabase);

	constructor(...args){
		if( _.isString(args[0]) && _.isString(args[1]) ){
			let [name, path] = args;
			this.name = name;
			this.path = path;
		}
		else{
			let obj:IDatabase;
			if( _.isString(args[0]) ){
				try{
					let [jsonStr] = args;
					obj = JSON.parse(jsonStr);
				}catch(err){
					return;
				}
			}else if(_.isObject(args[0])){
				obj = args[0] as IDatabase;
			}else{
				return;
			}

			this.parseJSON(obj);
		}
	}

	createPack(name:string) : DBPack{
		let pack:DBPack = new DBPack(name);

		return pack;
	}

	parseJSON(obj:IDatabase){
		if(_.isString(obj.name)){
			this.name = obj.name;
		}
		if(_.isObject(obj.packs)){
			let packs = _.clone(obj.packs);
			for(let [name, pack] of Object.entries(packs)){
				this.packs[name] = new DBPack(pack);
			}
		}
		if(_.isString(obj.path)){
			this.path = obj.path;
		}
		if(_.isObject(obj.details)){
			this.details.dateCreated = obj.details.dateCreated
			this.details.dateModified = obj.details.dateModified
		}
	}

	toJSON() : IDatabase {
		let jsonObj = {
			name: this.name,
			path: this.path,
			packs: {},
			details: _.clone(this.details),
		}

		for(let [id, pack] of Object.entries(this.packs)){
			jsonObj.packs[id] = pack.toJSON();
		}

		return jsonObj;
	}
}

interface IDBConnection {
	id: IDType;
	database: IDType;
	ip: string;
	details: {
		dateCreated: Date;
		dateSynced: Date;
		datePinged: Date;
	}
}