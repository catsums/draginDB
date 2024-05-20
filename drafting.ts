
interface Object<T=any> {
	[key:string|number|symbol]: T;
}

type JSONDate = string | number;

type JSONType = string | number | boolean | null | JSONType[] | JSONObject | JSONDate;

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
}

class DBPath {
	path:string;
	static token:string = "Path";

	constructor(path:string){
		if(DBToken.hasToken(DBPath.token, path)){
			let [t, p] = DBToken.getTokenData(path) as [string, string];
			path = p;
		}
		this.path = path;
	}
}



interface IRecord extends JSONObject {
	$id: IDType;
	[key: string]: JSONType;
}

interface IIndex extends JSONObject {
	$id: IDType;
	field: string;
	records: {
		[key:string]: string;
	};
}

interface IPack extends JSONObject {
	name: string;
	records: {
		[id:string]: IRecord;
	};
	indexes: {
		[id:string]: IIndex;
	},
	$details: {
		dateCreated: number;
		dateModified: number;
	};
}

interface IDatabase extends JSONObject {
	name: string;
	collections: {
		[name:string]: IPack;
	};
	path: PathType;
	$details: {
		dateCreated: number;
		dateModified: number;
	};
}

interface IDBConnection {
	id: IDType;
	database: IDType;
	ip: string;
}