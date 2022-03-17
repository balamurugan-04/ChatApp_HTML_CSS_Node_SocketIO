const path = require("path");
const express = require("express");
const serverless = require("serverless-http");

const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const router = express.Router();
const formatMessage = require("./utils/messages");
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require("./utils/users");

const botName = "ChatBot";
// Setting static folder
app.use(express.static(path.join(__dirname, "public")));

// Run when client connects
io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit("message", formatMessage(botName, `Welcome to the ${user.room} ${user.username}`));

    // Broadcast when a user connects
    socket.broadcast.to(user.room).emit("message", formatMessage(botName, `${user.username} has joined the chat`));

    // Send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  // Listen for chat messages
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // User leaves the chat
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      console.log("got in");
      io.to(user.room).emit("message", formatMessage(botName, `${user.username} has left the chat`));

      // Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

app.use(`/.netlify/functions/api`, router);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running in : " + PORT);
});

module.exports.handler = serverless(app);
