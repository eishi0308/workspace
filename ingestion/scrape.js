import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { embeddingModel } from "../lib/bot.js";
import { collection } from "../lib/db.js";

const url = "";

// Fetch the content from the URL

// Parse the content using Readability

// Split the content into chunks

// Create vector embeddings of the data

// Create the documents that we will save in the database and store them in Astra DB
