import axios from "axios";



export default function useRequest(context: any) {
  const upload = async (files: Array<File>) => {
    if (files) {
      console.log('upload' + files)
      try {
        console.log('BASIC_USER:' + context.env.BASIC_USER)
        console.log('BASIC_USER:' + context.env.BASIC_PASS)
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
