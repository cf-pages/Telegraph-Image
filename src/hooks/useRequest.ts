import axios from "axios";

const BASE_URL = import.meta.env.BASE_URL

export default function useRequest() {
  const upload = async (files: Array<File>) => {
    if (files) {
      console.log('upload' + files)
      try {
        console.log(BASE_URL)
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
