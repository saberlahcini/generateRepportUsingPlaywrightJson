import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";





dotenv.config();


const TELEGRAM_API_URL = "https://api.telegram.org/bot";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.CHAT_ID;
const baseUrl = `${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/`;


const htmlFile = path.join(__dirname, '..', 'test.html');


const telegramApi = axios.create({
  baseURL: baseUrl,
});




const sendMessage = async (message) => {
  try {
    const response = await telegramApi.post("sendMessage", {}, {
      params: {
        chat_id: chatId,
        text: message,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error sending message:", error.response?.data || error.message);
    throw error;
  }
}

const sendDocument = async (filePath) => {
  try {
 
    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("document", fs.createReadStream(filePath)); 

    await telegramApi.post("sendDocument", formData );

  } catch (error) {
    console.error("Error sending document:", error.response?.data || error.message);
    throw error;
  }

}


 await sendMessage("hi bot cv how are you?");
 await sendDocument(htmlFile);