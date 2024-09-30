import markdownIt from "markdown-it";

const md = markdownIt();

const SCROLL_OPTIONS = {
  block: "end",
  inline: "nearest",
  behavior: "smooth",
};

function buildMessage(message) {
  const li = document.createElement("li");
  li.classList.add(message.role);
  const article = document.createElement("article");
  for (const part of message.parts) {
    const p = md.render(part.text);
    article.innerHTML += p;
  }
  li.appendChild(article);
  return li;
}

function appendMessage(message) {
  const messages = document.querySelector(".chat");
  const newMessage = buildMessage(message);
  messages.appendChild(newMessage);
  newMessage.scrollIntoView(SCROLL_OPTIONS);
  return newMessage;
}

async function sendMessage(event) {
  event.preventDefault();
  const form = event.target;
  const input = form.querySelector("#query");
  const body = { query: input.value };
  appendMessage({ role: "user", parts: [{ text: input.value }] });
  input.value = "";
  const response = await fetch("/messages", {
    method: form.getAttribute("method"),
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const li = appendMessage({ role: "model", parts: [{ text: "" }] });
  const article = li.querySelector("article");
  const decoder = new TextDecoderStream("utf-8");
  let text = "";
  const writer = new WritableStream({
    write(chunk) {
      text += chunk;
      article.innerHTML = md.render(text);
    },
  });
  response.body.pipeThrough(decoder).pipeTo(writer);
  li.scrollIntoView(SCROLL_OPTIONS);
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  form.addEventListener("submit", sendMessage);
  fetch("/history")
    .then((response) => response.json())
    .then((messages) => {
      messages.forEach((message) => {
        appendMessage(message);
      });
    });
});
