# GDG Cloud Melbourne Hands-on Workshop

This workshop will give you an understanding of how to build with GenAI as a developer. We will go from making a simple API call to an LLM to understanding and implementing Retrieval-Augmented Generation (RAG) to feed context to your bot.

You will leave with an application that will give you a basis for creating bots that work with your data and a bit of inspiration for what else you can manifest with GenAI.

* [GDG Cloud Melbourne Hands-on Workshop](#gdg-cloud-melbourne-hands-on-workshop)
  * [Prerequisites](#prerequisites)
  * [The workshop](#the-workshop)
    * [Getting started](#getting-started)
    * [Creating a database](#creating-a-database)
    * [Creating a working environment](#creating-a-working-environment)
    * [Setting up environment variables](#setting-up-environment-variables)
      * [Gemini API key](#gemini-api-key)
      * [Astra DB setup and credentials](#astra-db-setup-and-credentials)
      * [Session secret](#session-secret)
    * [Run the application](#run-the-application)
    * [Implementing Chat with Gemini](#implementing-chat-with-gemini)
    * [Retrieval-Augmented Generation](#retrieval-augmented-generation)
      * [Ingesting unstructured data](#ingesting-unstructured-data)
      * [Passing context to the model](#passing-context-to-the-model)
  * [Well done!](#well-done)

## Prerequisites

To take part in this workshop you will need:

- a Google account (head to https://ai.google.dev/aistudio)
- a DataStax account ([sign up for a free DataStax account here](https://dtsx.io/gdg-rag-workshop))
- Optional, but really useful, a GitHub account

## The workshop

We are going to create a RAG-powered chat bot that can answer questions on web pages that we provide to it. This repo contains a simple chat interface and an Express server which we are going to connect together to power a bot.

The bot will be built with [Google's Gemini Flash 1.5](https://deepmind.google/technologies/gemini/flash/) and [DataStax Astra DB](https://www.datastax.com/products/datastax-astra).

### Getting started

First we need to provision a database. The reason for the database will be explained later, but for now we just need to create it as it takes a little while to provision.

### Creating a database

Head to the [Astra DB dashboard](https://astra.datastax.com/) and click _Create a Database_. Ensure that **Serverless (Vector)** is selected then choose a name for your database. You can also choose a provider and a region.

> [!Note]
> It doesn't matter what provider and region you choose, but some regions will be unavailable to free accounts

Once you click create, the database will start provisioning.

### Creating a working environment

We are going to work in a GitHub Codespace to ensure we all have the same environment.

This repo is a template repo, you can use it to create a new repo with the green _Use this template_ button at the top. Click on it and choose _Create a new repository_. Create the new repo in your own account.

Once you have done that, click on the green _Code_ button, then the _Codespaces_ tab and click _Create codespace on main_. This will generate a new environment you can work in, with all the required dependencies and a version of VS Code in the browser to view and edit files.

<details>
<summary>Advanced working environment setup</summary>
If you would prefer to run this application locally, you will need Node.js v22.2.* installed.

You can then clone the repo:

```bash
git clone ...
```

And carry on locally.

</details>

Once you have the repo loaded in VS Code, install the dependencies by opening the terminal and running:

```bash
npm install
```

### Setting up environment variables

To keep secrets and credentials out of the repo, we use a `.env` file. In the application, copy the existing file, called `.env.example` to `.env`.

#### Gemini API key

The first secret we need is an API key to interact with Gemini models. You can get that from [Google AI Studio](https://ai.google.dev/aistudio).

Copy your key into the `.env` file as the `GEMINI_API_KEY`.

#### Astra DB setup and credentials

By now, the database should have completed provisioning. Head back to the [Astra DB dashboard](https://astra.datastax.com). Find your database and click it.

On the overview, you will find an API Endpoint. Copy this into the `.env` file as `ASTRA_DB_ENDPOINT`.

Below the API Endpoint there is a button to generate an application token. Generate a token and then copy it into the `.env` file as `ASTRA_DB_TOKEN`.

Now we need a collection. Click on the _Data Explorer_ tab then _Create Collection_.

Give the collection a name and choose **Bring my own** in the embedding generation method. Enter **768** for the dimensions and select the similarity metric **Cosine**.

Hit the button to create the collection.

In the codespace, enter the collection name you chose as the `ASTRA_DB_COLLECTION` setting.

#### Session secret

This application stores chat history in a session in memory. We need to generate a random string for the session secret. You can do so by running the following script in the terminal in the codespace:

```bash
node ./scripts/secret.js
```

### Run the application

You should now be ready to run the app with the following script in the terminal:

```bash
npm start
```

You should be able to open the app and interact with the chat box. It's not very useful yet though. We haven't implemented any interaction with Gemini yet.

### Implementing Chat with Gemini

Open `./lib/bot.js`. You will find some setup code to create the Gemini Flash model and provide it with some settings. These settings are the defaults from AI Studio, you can adjust them later to see the effects.

Open `./lib/routes.js`. Here, the route `/messages` is where the chat input is sent to. We need to:

- get the query from the body of the request
- create an instance of the model
- send the query to the model
- return the response to the front end
- store the query and response as messages in the history

<details>
<summary>Hooking up the bot</summary>

We can use the `createBot` function exported from `./lib/bot.js` to initialise our model. We then send it our query using the `sendMessageStream` function.

This returns a stream of data in response which we collect in a variable called `text` and also write to the response as it arrives. The front end is already prepared to receive this streaming response.

Finally we add the user and model's messages to the `messages` array in the format of an object with a `role` and `parts`.

```js
router.post("/messages", async (req, res) => {
  const messages = req.session.messages || [];
  const { query } = req.body;
  res.set("Content-Type", "text/plain");

  const bot = createBot(SYSTEM_MESSAGE, messages);

  const result = await bot.sendMessageStream(query);
  let text = "";
  for await (const chunk of result.stream) {
    text += chunk.text();
    res.write(chunk.text());
  }
  messages.push({ role: "user", parts: [{ text: query }] });
  messages.push({ role: "model", parts: [{ text }] });

  req.session.messages = messages;
  res.end();
});
```

</details>

> [!Note]
> You can checkout the branch `1-initial-chat` to get to this stage.

### Retrieval-Augmented Generation

The model is now hooked up to our interface, but all it has is the existing model knowledge. This is no more useful than chatting with Gemini as a consumer.

Retrieval-Augmented Generation is a technique for providing relevant context to models in order to give them previously unknown knowledge and reduce hallucinations.

RAG consists of two stages:

- gathering mostly unstructured data, breaking the data up into chunks, creating embedding vectors of the chunks and then storing the data and the embeddings in a vector database
- when a user query is made to the bot, turning the query into a vector embedding, searching the database for similar chunks of data, and then providing that data to the model along with the original query

Let's gather some data!

#### Ingesting unstructured data

For this workshop we will gather data from web pages on the open internet. This is typically how models are trained, but since they have a cut off date the data on the web is likely more up to date.

Open `./ingestion/scrape.js`. There is space to write a script to scrape content from the web and ingest it to the database.

First you need to choose a URL (or list of URLs) you want to scrape data from. Then you can use `fetch` to get the text content of a page.

<details>
<summary>Using fetch to scrape data from a URL</summary>

```js
const response = await fetch(url);
const text = await response.text();
```

</details>

Once you have the text, we want to remove unrelated content like the header, navigation, footer. Mozilla makes a standalone version of their Reader model available which we will take advantage of. The `JSDOM` and `Readability` classes are already imported for you.

<details>
<summary>Using Readability to parse the page into a single article</summary>

```js
const doc = new JSDOM(text, { url }).window.document;
const reader = new Readability(doc);
const article = reader.parse();
const data = `${article.title}\n\n${article.textContent}`.trim();
```

</details>

Once we have the article content as data we need to split it into chunks. Smaller chunks contain more focused context and help to improve search results.

Langchain is a more comprehensive framework for building GenAI applications, but for this we will just use their text splitters. The `RecursiveCharacterTextSplitter` is a great default to choose and we will use it here to split the text into 1024 character chunks with a 128 character overlap.

<details>
<summary>Using the RecursiveCharacterTextSplitter to chunk up the text</summary>

```js
const splitter = new RecursiveCharacterTextSplitter({
  chunkOverlap: 128,
  chunkSize: 1024,
});
const chunks = await splitter.splitText(data);
```

</details>

Now we have chunks of data, we can create vector embeddings of them using the `GoogleGenerativeAI` library, but with a different model than earlier.

<details>
<summary>Using the Google text-embedding-004 embedder to create vector embeddings</summary>

```js
const embeddings = await Promise.all(
  chunks.map(async (chunk) => {
    const result = await embeddingModel.embedContent(chunk);
    return result.embedding.values;
  })
);
```

</details>

Finally we need to turn these disparate chunks and embeddings into documents we can put in the database and then insert them.

<details>
<summary>Inserting the documents into Astra DB</summary>

```js
const documents = embeddings.map((embedding, i) => ({
  $vector: embedding,
  content: chunks[i],
  metadata: { url },
}));

const results = await collection.insertMany(documents);
console.log(`Inserted: ${results.insertedCount}`);
```

</details>

Run the whole script and once it is complete your database will be full of chunks of content.

> [!Note]
> You can check out the branch `2-ingestion` to bring your application up to this state.

#### Passing context to the model

The final stage for RAG is to take the incoming user query, use the same text embedding model to create vector embeddings, search the database for similar documents and provide them as context to the model.

<details>
<summary>Providing context from the database to the model</summary>

Here is the full route:

```js
router.post("/messages", async (req, res) => {
  const messages = req.session.messages || [];
  const { query } = req.body;
  res.set("Content-Type", "text/plain");

  const embeddingResult = await embeddingModel.embedContent(query);
  const cursor = await collection.find(
    {},
    {
      sort: { $vector: embeddingResult.embedding.values },
      limit: 10,
      includeSimilarity: true,
    }
  );
  const context = (await cursor.toArray())
    .map((doc) => doc.content)
    .join("\n\n");

  console.log(context);

  const prompt = `Answer the question with the given context.
Question: ${query}
Context: ${context}
Answer:`;

  const bot = createBot(SYSTEM_MESSAGE, messages);

  const result = await bot.sendMessageStream(prompt);
  let text = "";
  for await (const chunk of result.stream) {
    text += chunk.text();
    res.write(chunk.text());
  }
  messages.push({ role: "user", parts: [{ text: query }] });
  messages.push({ role: "model", parts: [{ text }] });

  req.session.messages = messages;
  res.end();
});
```

</details>

> [!Note]
> You can check out the branch `3-rag` to bring your application up to this state.

## Well done!

You now have a basic RAG application built using Gemini and Astra DB.

For the next steps, check out the following resources:

- [Blog: What is a Vector Database?](https://www.datastax.com/guides/what-is-a-vector-database?utm_medium=event&utm_source=meetup&utm_campaign=phil_nash_gdg_workshop_melbourne&utm_content=)
- [Blog: What is RAG?](https://www.datastax.com/guides/what-is-retrieval-augmented-generation?utm_medium=event&utm_source=meetup&utm_campaign=phil_nash_gdg_workshop_melbourne&utm_content=)
- Demo: SwiftieGPT ([app](https://www.tswift.ai/), [repo](https://github.com/datastax/SwiftieGPT), [blog post](https://www.datastax.com/blog/using-astradb-vector-to-build-taylor-swift-chatbot))
- Demo: Movies++ ([app](https://sf-ai-demo.vercel.app/), [repo](https://github.com/datastax/movies_plus_plus), [blog post](https://www.datastax.com/blog/finding-right-movie-semantic-search-how-we-built-movies-app))
- Demo: Hum to Search ([app](https://hum-search.vercel.app/), [repo](https://github.com/sribala20/h2s), [blog post](https://www.datastax.com/blog/building-hum-to-search-music-recognition-app-vector-search?utm_medium=event&utm_source=meetup&utm_campaign=phil_nash_gdg_workshop_melbourne&utm_content=))
- Demo: Babbelfish ([app](https://babbelfish-ai.onrender.com/), [repo](https://github.com/SonicDMG/babbelfish.ai), [blog post](https://www.datastax.com/blog/building-a-language-translation-app-part-1-iterating-with-langflow?utm_medium=event&utm_source=meetup&utm_campaign=phil_nash_gdg_workshop_melbourne&utm_content=))
- Demo: doyouknowyourstuff ([app](https://doyouknowyourstuff.vercel.app), [repo](https://github.com/datastax/doyouknowyourstuff))
- Demo: Fashion Buddy ([app](https://dtsx.io/fashion_buddy), [repo](https://github.com/datastaxdevs/workshop-rag-fashion-buddy), [video](https://www.youtube.com/watch?v=_uuHqGbmIkI))
- Demo: Chunkers ([app](https://chunkers.vercel.app/), [repo](https://github.com/philnash/chunkers), [blog post](https://www.datastax.com/blog/how-to-chunk-text-in-javascript-for-rag-applications?utm_medium=event&utm_source=meetup&utm_campaign=phil_nash_gdg_workshop_melbourne&utm_content=))
