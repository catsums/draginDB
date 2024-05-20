import _ from "lodash";
import * as MY from "@catsums/my";
import path from "path";
import fs from "fs";
import { 
	IIndex, IDatabase, 
	IObject, IPack, IRecord, 
	JSONDate, JSONType, JSONObject,
	IDType, PathType, DBDataType,
} from './interface';

export class DBIndex implements IIndex {
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

export class DBPack implements IPack {
	private static RecordIDPrefix = `Rec-`;
	name = "";
	records:IObject<IRecord> = {};
	// indexes:IObject<DBIndex> = {};
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

	// createIndex(field: string){
	// 	let index = new DBIndex(field);

	// 	index.processPack(this);

	// 	delete this.indexes[field];
	// 	this.indexes[field] = index;
	// }

	public createRecord(jsonStr:string) : IRecord;
	public createRecord(jsonObj:JSONObject) : IRecord;
	createRecord(data: string|JSONObject){
		let record:IRecord;
		if(_.isString(data)) {
			try{
				record = JSON.parse(data);
			}catch(err){
				throw err;
			}
		}else{
			record = data as IRecord;
		}

		let recordID = MY.randomID(DBPack.RecordIDPrefix);
		if(record.$id){
			recordID = record.$id;
		}else{
			record.$id = recordID;
		}

		this.records[recordID] = record;

		return record;
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
		// if(_.isObject(obj.indexes)){
		// 	let indexes = _.clone(obj.indexes);
		// 	for(let [name, index] of Object.entries(indexes)){
		// 		this.indexes[name] = new DBIndex(index);
		// 	}
		// }
		if(_.isObject(obj.details)){
			this.details.dateCreated = obj.details.dateCreated;
			this.details.dateModified = obj.details.dateModified;
		}

	}

	toJSON() : IPack{
		let jsonObj = {
			name: this.name,
			records: _.clone(this.records),
			// indexes: {},
			details: _.clone(this.details),
		}

		// for(let [id, index] of Object.entries(this.indexes)){
		// 	jsonObj.indexes[id] = index.toJSON();
		// }

		return jsonObj;
	}
}

export class DBDatabase implements IDatabase {
	name = "";
	packs:IObject<DBPack> = {};
	path: PathType;
	details = {
		dateCreated: Date.now(),
		dateModified: Date.now(),
	}

	static async WriteDatabase(db:DBDatabase, path:PathType = db.path) {
		return fs.promises.writeFile(`${path}`, JSON.stringify(db.toJSON(), null, 4), {
			flag: "w"
		});
	}
	static async ReadDatabase(path:PathType) {
		let data = await fs.promises.readFile(path, {
			encoding: "utf8",
		});

		try{
			let obj = JSON.parse(data) as IDatabase;
			return new DBDatabase(obj);
		}catch(err){
			throw err;
		}
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

		this.packs[pack.name] = pack;

		return pack;
	}
	getPackByName(name:string) : DBPack{
		let pack = this.packs[name];

		return pack;
	}
	deletePack(name:string) : DBPack{
		let pack = this.packs[name];
		delete this.packs[name];

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