
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const port = (process.env.PORT || 8000);
server.listen(port, () => {
  console.log("hello")
});


class Player {
  id: number;
  turn: boolean;
  type: any;
  
  constructor(playerID, turn, type) {
      /// Id of the player
      this.id = playerID;
      /// Whether it is the players turn
      this.turn = turn;
      /// The type of the player "X" or "O"
      this.type = type;
  }

  equals(rhs) {
      return (this.id == rhs.id
          && this.turn == rhs.turn
          && this.type == rhs.type);
    }
}


class Game {

    id: number;
    player1: Player;
    player2: Player;
    gameboard: {[key: number]: string}
    
    constructor(gameID) {
        /// Id of the game
        this.id = gameID;
        /// Information about player1
        this.player1 = null;
        /// Information about player2
        this.player2 = null;
        /// Tic-tac-toe gameboard
        this.gameboard = {
            0: ""
            , 1: ""
            , 2: ""
            , 3: ""
            , 4: ""
            , 5: ""
            , 6: ""
            , 7: ""
            , 8: ""
        };
    }

    /**
     * Resets the gameboard and the turn of the players
     */
    reset() {
        // Reset gameboard
        this.gameboard = {
            0: ""
            , 1: ""
            , 2: ""
            , 3: ""
            , 4: ""
            , 5: ""
            , 6: ""
            , 7: ""
            , 8: ""
        };

        // Player1 starts the games
        this.player1.turn = true;
        this.player2.turn = false;
    }

  
    addPlayer(playerID) {
        // Check which player to add (only two players per game)
        if (this.player1 == null) {
            this.player1 = new Player(playerID, true, "X");
            return "player1";
        } else {
            this.player2 = new Player(playerID, false, "O");
            return "player2";
        }
    }

   
    checkValid(player, cell) {
        // Must check that player is one of the players
        if (player.turn && (this.player1.equals(player) || this.player2.equals(player))) {
            return this.gameboard[cell] == "";
        }

        return false;
    }

    
    updateBoard(cell, type) {
        this.gameboard[cell] = type;
        this.updateTurns();
    }

    /**
     * Updates the turns of the players
     */
    updateTurns() {
        this.player1.turn = !this.player1.turn;
        this.player2.turn = !this.player2.turn;
    }


    checkStatus() {
        let board = this.gameboard;
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
    }
}

/// Contains the ids of games being played
var games = {};

// Called when socket connects.
io.sockets.on('connection', function (socket) {

    // Called when user creates a game
    socket.on("create", function () {
        // Create lobby id
        let done = false;
        let gameID = Math.floor((Math.random() * 100)).toString();
        while (!done) {
            if (games[gameID] == null) {
                done = true;
            } else {
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
        
        let gameID = data.gameID.toString();
        console.log(gameID)
        if (games[gameID] != null) {
            // Add player to the game
            
            games[gameID].addPlayer(socket.id);

            // Join lobby
            socket.join(gameID);
            socket.lobby = gameID;
           
            // Emit data to first player.
            socket.in(gameID).emit('start', {
                id: gameID, gameboard: games[gameID].gameboard,
                player: games[gameID].player1
                
            });

            // Emit data to second player.
            socket.emit("start", {
                id: gameID, gameboard: games[gameID].gameboard,
                player: games[gameID].player2
            });

        } else {
            // Game does not exist. Emit a failure to socket.
            socket.emit("failed");
        }
    });

    // Called when a move is made
    socket.on("move", function (data) {
        // Make sure it is a valid move
        let gameID = data.id;
        console.log(data.player, data.cell)
        let valid = games[gameID].checkValid(data.player, data.cell);
        if (valid) {
            // Update board based on move
            games[gameID].updateBoard(data.cell, data.player.type);

            // Check status of the game
            let status = games[gameID].checkStatus();
            if (status == "ongoing") {
                // Game is still continuing. Update both players
                socket.in(gameID).emit('updateGame', {
                    id: gameID
                    , gameboard: games[gameID].gameboard
                });
                socket.emit("updateGame", {
                    id: gameID
                    , gameboard: games[gameID].gameboard
                });

            } else if (status == "win") {
                // Game is won. Emit win and loss
                socket.emit("win", games[gameID].gameboard);
                socket.in(gameID).emit("loss", games[gameID].gameboard);
            } else {
                // Game is a tie. Emit a tie to both players.
                socket.emit("tie", { gameboard: games[gameID].gameboard });
                socket.in(gameID).emit("tie", {
                    gameboard: games[gameID].gameboard
                });
            }

        } else {
            // Emit invalid move
            socket.emit("invalid");
        }
    });

    // Called when person calls for restart of game.
    socket.on("restart", function (data) {
        // Reset the game board
        let gameID = data.id;
        games[gameID].reset();

        // Emit data to first player.
        socket.emit("start", {
            id: gameID, gameboard: games[gameID].gameboard, player: games[gameID].player1
        });

        // Emit data to second player.
        socket.in(gameID).emit('start', {
            id: gameID, gameboard: games[gameID].gameboard, player: games[gameID].player2
        });

    });

    // Called when connection is lost
    socket.on("disconnect", function () {
        // Remove the lobby and emit 'quit'
        if (socket.lobby != null) {
            socket.emit("quit");
            socket.in(socket.lobby.toString()).emit("quit");
            delete games[socket.lobby];
        }
    });

    // socket.on("spectate", {data: getActiveRooms});
    socket.on("spectate",() => {
      console.log(socket.adapter.rooms)
      const arr = Array.from(io.sockets.adapter.rooms);
      //console.log(arr)
      // console.log(gameID)
      const filtered = arr.filter(room => !room[1].has(room[0]))
      //console.log(filtered)
      const res = filtered.map(i => i[0]);
      //console.log(res)
      // return res;
      socket.emit("roomsAvail",{roomsArr: res, })
    })

    socket.on('joinSpec', function (data) {
      // Check if the game exists
      let gameID = data.gameID.toString();
      console.log(gameID)
      console.log(games)
      if (games[gameID] != null) {
        console.log(socket.adapter.rooms)
        const arr = Array.from(io.sockets.adapter.rooms);
        console.log(arr)
        // console.log(gameID)
        const filtered = arr.filter(room => !room[1].has(room[0]))
        console.log(filtered)
        const res = filtered.map(i => i[1]);
        console.log(res.entries)

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

let getActiveRooms = (io) => {
  // console.log(io.sockets.adapter.rooms)
  const arr = Array.from(io.sockets.adapter.rooms);
  // console.log(arr)
  // Filter rooms whose name exist in set:
  // ==> [['room1', Set(2)], ['room2', Set(2)]]
  const filtered = arr.filter(room => !room[1].has(room[0]))
  // console.log("------",filtered)
  // Return only the room name: 
  // ==> ['room1', 'room2']
  const res = filtered.map(i => i[0]);
  // console.log(res)
  return res;
}

