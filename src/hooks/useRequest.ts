import axios from "axios";
// import {type PagesFunction, type KVNamespace, Response as CfResponse} from "@cloudflare/workers-types";
//
// interface Env {
//     KV: KVNamespace;
// }


export function useRequest() {
  const upload = async (files: Array<File>) => {
    if (files) {
      console.log('upload' + files)
      try {
        const result = await axios.post('http://localhost:8080/upload', files);
        console.log(result)
      } catch (e) {
        console.log(e)
      }
    }
  };

  return {
    upload
  }
}
