import axios from "axios";

const BASIC_USER = import.meta.env.BASIC_USER
const BASIC_PASS = import.meta.env.BASIC_PASS

export default function useRequest() {
  const upload = async (files: Array<File>) => {
    if (files) {
      console.log('upload' + files)
      try {
        console.log('BASIC_USER:' + BASIC_USER)
        console.log('BASIC_USER:' + BASIC_PASS)
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
