import * as dotenv from 'dotenv';
import pino from 'pino';
import fs from 'node:fs';
import path from 'node:path';
import Groq from "groq-sdk";

dotenv.config();

const logger = pino({
  base: false,
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const messages = [
  {
    role: 'system',
    content: "Act as a helpful Assistant.\nToday's date is July 2, 2024.\n"
  },
  {
    role: 'user',
    content: "You are helpful Assistant for Crescendo, a company that provides a full-stack CX service with the most advanced Generative AI technology integrated with our human-in-the-loop service.\n"+
        "Refer to yourself as Assistant. \nYou are talking with a user who is a potential lead.\n"+
        "You are provided with the information about Crescendo in the Context below. \nAnswer questions about Crescendo.\n"+
        "Politely reject to answer questions on any other topics.\n"+
        "Use only the information provided to you in the context below and in further messages.\n"+
        "If you don't know the answer, just say that you don't know, don't try to make up an answer.\n"+
        "Make your answers short.\n"
  },
  {
    role: 'assistant',
    content: "Hello! How can we help?"
  },
  {
    role: "user",
    content: 'Use the following pieces of context to reply to User Message at the end.\n\n'+
        "Crescendo is a company that integrates AI and human expertise to enhance customer experience (CX), distinguishing itself by charging only for successful outcomes. Crescendo offers a full-stack CX service with the most advanced Generative AI technology integrated with our human-in-the-loop service. Crescendo provides CX Messaging Assistant which is a digital assistant that can engage customers in conversations about products or services, CX Voice Assistant is a virtual agent application that can answer phone calls for your enterprise, CX Insights which is a CX operational dashboard that includes 100% Voice of Customer (VoC) coverage for all interactions handled by Crescendo.  Crescendo’s AI powered analysis includes common VoC metrics such as Net Promotor Score (NPS) and Customer Satisfaction (CSAT).  The CX Insights application also summarizes all conversations and produces business insights based on conversation transcripts.\n\n\n"+
        'Continue conversation replying to User Message.\n\n'+
        'User Message:\n'+
        "what services Crescendo provides ?"
  }
]

async function groqNonStreamingRequest(idx) {
  const startTs = Date.now();
  const chatCompletion = await groq.chat.completions.create({
    messages: messages,
    model: 'llama3-70b-8192',
    temperature: 0,
    max_tokens: 512,
    top_p: 1,
    stream: false,
    stop: null,
  });
  const endTs = Date.now();
  const resultText = chatCompletion.choices[0].message.content;
  const total_tokens=chatCompletion?.usage?.total_tokens || 0;
  const total_time=chatCompletion?.usage?.total_time || 0;
  const took = endTs - startTs;
  logger.info(`Request[${idx}]: took ${took} msec, total_tokens: ${total_tokens}, total_time: ${total_time}, result:"${resultText.substring(0,15)}..."`);
  return took;
}

async function executeConcurrentRequest(concurrency = 1) {
  const allPromises = [];
  for (let i = 0; i < concurrency; i++) {
    allPromises.push(groqNonStreamingRequest(i));
  }
  const allResults = await Promise.allSettled(allPromises);
  const allTimings = allResults.map((x) => x.value);
  logger.info(`Timings: ${JSON.stringify(allTimings)}`);
  return allTimings;
}


async function executeTest() {
  // Warm up, so client will connect
  await groqNonStreamingRequest(0);
  // Run concurrent requests
  await executeConcurrentRequest(50);
  logger.info(`Finished`);
}

async function main() {
  await executeTest();
}

main()
  .then(() => {
    console.log(`Execution finished`);
  })
  .catch((e) => {
    console.log(`Exception: ${e.message}`);
  });
