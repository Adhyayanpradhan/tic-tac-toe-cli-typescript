var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var port = (process.env.PORT || 8000);
server.listen(port, function () {
    console.log("hello");
});
var Player = /** @class */ (function () {
    function Player(playerID, turn, type) {
        /// Id of the player
        this.id = playerID;
        /// Whether it is the players turn
        this.turn = turn;
        /// The type of the player "X" or "O"
        this.type = type;
    }
    Player.prototype.equals = function (rhs) {
        return (this.id == rhs.id
            && this.turn == rhs.turn
            && this.type == rhs.type);
    };
    return Player;
}());
var Game = /** @class */ (function () {
    function Game(gameID) {
        /// Id of the game
        this.id = gameID;
        /// Information about player1
        this.player1 = null;
        /// Information about player2
        this.player2 = null;
        /// Tic-tac-toe gameboard
        this.gameboard = {
            0: "",
            1: "",
            2: "",
            3: "",
            4: "",
            5: "",
            6: "",
            7: "",
            8: ""
        };
    }
    /**
     * Resets the gameboard and the turn of the players
     */
    Game.prototype.reset = function () {
        // Reset gameboard
        this.gameboard = {
            0: "",
            1: "",
            2: "",
            3: "",
            4: "",
            5: "",
            6: "",
            7: "",
            8: ""
        };
        // Player1 starts the games
        this.player1.turn = true;
        this.player2.turn = false;
    };
    Game.prototype.addPlayer = function (playerID) {
        // Check which player to add (only two players per game)
        if (this.player1 == null) {
            this.player1 = new Player(playerID, true, "X");
            return "player1";
        }
        else {
            this.player2 = new Player(playerID, false, "O");
            return "player2";
        }
    };
    Game.prototype.checkValid = function (player, cell) {
        // Must check that player is one of the players
        if (player.turn && (this.player1.equals(player) || this.player2.equals(player))) {
            return this.gameboard[cell] == "";
        }
        return false;
    };
    Game.prototype.updateBoard = function (cell, type) {
        this.gameboard[cell] = type;
        this.updateTurns();
    };
    /**
     * Updates the turns of the players
     */
    Game.prototype.updateTurns = function () {
        this.player1.turn = !this.player1.turn;
        this.player2.turn = !this.player2.turn;
    };
    Game.prototype.checkStatus = function () {
        var board = this.gameboard;
        // Check row 1
        if ((board[0] != "") && ((board[0] == board[1]) && (board[1] == board[2]))) {
            return "win";
        }
        // Check row 2
        if ((board[3] != "") && ((board[3] == board[4]) && (board[4] == board[5]))) {
            return "win";
        }
        // Check row 3
        if ((board[6] != "") && ((board[6] == board[7]) && (board[7] == board[8]))) {
            return "win";
        }
        // Check col 1
        if ((board[0] != "") && ((board[0] == board[3]) && (board[3] == board[6]))) {
            return "win";
        }
        // Check col 2
        if ((board[1] != "") && ((board[1] == board[4]) && (board[4] == board[7]))) {
            return "win";
        }
        // Check col 3
        if ((board[2] != "") && ((board[2] === board[5]) && (board[5] == board[8]))) {
            return "win";
        }
        // Check diag 1
        if ((board[0] != "") && ((board[0] === board[4]) && (board[4] == board[8]))) {
            return "win";
        }
        // Check diag 2
        if ((board[2] != "") && ((board[2] === board[4]) && (board[4] == board[6]))) {
            return "win";
        }
        // Check board full with no winner
        if ((board[0] != "") && (board[1] != "") && (board[2] != "") && (board[3] != "") &&
            (board[4] != "") && (board[5] != "") && (board[6] != "") && (board[7] != "") && (board[8] != "")) {
            return "tie";
        }
        // Game is ongoing
        return "ongoing";
    };
    return Game;
}());
/// Contains the ids of games being played
var games = {};
// Called when socket connects.
io.sockets.on('connection', function (socket) {
    // Called when user creates a game
    socket.on("create", function () {
        // Create lobby id
        var done = false;
        var gameID = Math.floor((Math.random() * 100)).toString();
        while (!done) {
            if (games[gameID] == null) {
                done = true;
            }
            else {
                gameID = Math.floor((Math.random() * 100)).toString();
            }
        }
        // Create game and add player
        games[gameID] = new Game(gameID);
        games[gameID].addPlayer(socket.id);
        // Add socket to lobby and emit the gameID to the socket
        socket.join(gameID);
        socket.lobby = gameID;
        socket.emit('created', {
            id: gameID
        });
    });
    // Called when person attempts to join game
    socket.on('join', function (data) {
        var gameID = data.gameID.toString();
        console.log(gameID);
        if (games[gameID] != null) {
            // Add player to the game
            games[gameID].addPlayer(socket.id);
            // Join lobby
            socket.join(gameID);
            socket.lobby = gameID;
            // Emit data to first player.
            socket["in"](gameID).emit('start', {
                id: gameID, gameboard: games[gameID].gameboard,
                player: games[gameID].player1
            });
            // Emit data to second player.
            socket.emit("start", {
                id: gameID, gameboard: games[gameID].gameboard,
                player: games[gameID].player2
            });
        }
        else {
            // Game does not exist. Emit a failure to socket.
            socket.emit("failed");
        }
    });
    // Called when a move is made
    socket.on("move", function (data) {
        // Make sure it is a valid move
        var gameID = data.id;
        console.log(data.player, data.cell);
        var valid = games[gameID].checkValid(data.player, data.cell);
        if (valid) {
            // Update board based on move
            games[gameID].updateBoard(data.cell, data.player.type);
            // Check status of the game
            var status_1 = games[gameID].checkStatus();
            if (status_1 == "ongoing") {
                // Game is still continuing. Update both players
                socket["in"](gameID).emit('updateGame', {
                    id: gameID,
                    gameboard: games[gameID].gameboard
                });
                socket.emit("updateGame", {
                    id: gameID,
                    gameboard: games[gameID].gameboard
                });
            }
            else if (status_1 == "win") {
                // Game is won. Emit win and loss
                socket.emit("win", games[gameID].gameboard);
                socket["in"](gameID).emit("loss", games[gameID].gameboard);
            }
            else {
                // Game is a tie. Emit a tie to both players.
                socket.emit("tie", { gameboard: games[gameID].gameboard });
                socket["in"](gameID).emit("tie", {
                    gameboard: games[gameID].gameboard
                });
            }
        }
        else {
            // Emit invalid move
            socket.emit("invalid");
        }
    });
    // Called when person calls for restart of game.
    socket.on("restart", function (data) {
        // Reset the game board
        var gameID = data.id;
        games[gameID].reset();
        // Emit data to first player.
        socket.emit("start", {
            id: gameID, gameboard: games[gameID].gameboard, player: games[gameID].player1
        });
        // Emit data to second player.
        socket["in"](gameID).emit('start', {
            id: gameID, gameboard: games[gameID].gameboard, player: games[gameID].player2
        });
    });
    // Called when connection is lost
    socket.on("disconnect", function () {
        // Remove the lobby and emit 'quit'
        if (socket.lobby != null) {
            socket.emit("quit");
            socket["in"](socket.lobby.toString()).emit("quit");
            delete games[socket.lobby];
        }
    });
    // socket.on("spectate", {data: getActiveRooms});
    socket.on("spectate", function () {
        console.log(socket.adapter.rooms);
        var arr = Array.from(io.sockets.adapter.rooms);
        //console.log(arr)
        // console.log(gameID)
        var filtered = arr.filter(function (room) { return !room[1].has(room[0]); });
        //console.log(filtered)
        var res = filtered.map(function (i) { return i[0]; });
        //console.log(res)
        // return res;
        socket.emit("roomsAvail", { roomsArr: res });
    });
    socket.on('joinSpec', function (data) {
        // Check if the game exists
        var gameID = data.gameID.toString();
        console.log(gameID);
        console.log(games);
        if (games[gameID] != null) {
            console.log(socket.adapter.rooms);
            var arr = Array.from(io.sockets.adapter.rooms);
            console.log(arr);
            // console.log(gameID)
            var filtered = arr.filter(function (room) { return !room[1].has(room[0]); });
            console.log(filtered);
            var res = filtered.map(function (i) { return i[1]; });
            console.log(res.entries);
            // Emit data to first player.
            socket.emit('specstart', {
                id: gameID, gameboard: games[gameID].gameboard, player: games[gameID].player1
            });
            socket.emit('specstart', {
                id: gameID, gameboard: games[gameID].gameboard, player: games[gameID].player2
            });
        }
    });
});
var getActiveRooms = function (io) {
    // console.log(io.sockets.adapter.rooms)
    var arr = Array.from(io.sockets.adapter.rooms);
    // console.log(arr)
    // Filter rooms whose name exist in set:
    // ==> [['room1', Set(2)], ['room2', Set(2)]]
    var filtered = arr.filter(function (room) { return !room[1].has(room[0]); });
    // console.log("------",filtered)
    // Return only the room name: 
    // ==> ['room1', 'room2']
    var res = filtered.map(function (i) { return i[0]; });
    // console.log(res)
    return res;
};
