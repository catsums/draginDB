
import io from "socket.io-client";
import * as MY from "@catsums/my";


class MyClient {
	id:string;

	connect(url:string){
		let setData = (id) => {
			this.id = id;
			console.log({
				what: this,
				id,
			});
		}
		return new Promise<any>((resolve, reject) => {
			try{
				let socket = io(url);
	
				socket.on("connect", ()=>{
					socket.emit("open", JSON.stringify({
						id: MY.randomID(),
					}));
					
				}).on("open", (str:string) => {
					try{
						let res = JSON.parse(str);
	
						setData(res.data.id);
						resolve(res);
					}catch(err){
						throw err;
					}
				});
	
			}catch(err){
				reject(err);
			}
		})
	}
}


async function main(){
	let data = await new MyClient().connect(`http://localhost:8090/`);

	console.log(data);
}

main();