var inquirer = require('inquirer');
var args = process.argv;
// console.log(args[4])
var socketio = require("socket.io-client")(args[3]);
var game = {};
var keypress = require('keypress');
// console.log(args)
if (args.length !== 6) {
    console.log("Sorry not a correct format. Please Enter in this manner - node clientexp.ts -address http://localhost:8000 -name Addy");
    process.exit(1);
}
var playHistory = [];
// const questionsAndans = () => {}
var questions = [
    {
        type: 'rawlist',
        name: 'modes',
        message: '(choose an option)',
        validate: function (answer) {
            if (!answer) {
                return "Please, fill your choice!";
            }
            return true;
        },
        choices: ['Create a new game', 'Join a game', 'Spectate a Game']
    },
];
var joinQuestion = [
    {
        type: "input",
        name: "join",
        message: "Enter the joining id: "
    }
];
var tablePosNum = [{
        type: 'input',
        name: 'tabNum',
        message: "Your move (Enter a number from 0-8)"
    }];
socketio.on('connect', function () {
    console.log("Connected to the server. What would you like to do ".concat(args[args.length - 1], "? "));
    inquirer.prompt(questions).then(function (ans) {
        // console.log(ans)
        if (ans["modes"] === "Create a new game") {
            socketio.emit("create");
        }
        else if (ans["modes"] === "Join a game") {
            inquirer.prompt(joinQuestion).then(function (ansJoin) {
                if (ansJoin["join"] !== null) {
                    console.log("Thanks for joining ".concat(args[args.length - 1], ". Welcome onboard."));
                    // console.log("wow", game)
                    // game starts and player moves - 
                    socketio.emit('join', { gameID: +ansJoin["join"] });
                    // console.log("wow2", game) 
                }
            });
        }
        else if (ans["modes"] === "Spectate a Game") {
            console.log("ok");
            socketio.emit("spectate");
        }
    });
});
// socketio.on("spectate", (data) => {
//   console.log(data)
// })
socketio.on('created', function (data) {
    // Show the GameID
    console.log("Created a new game with id: ".concat(data.id, ". Send this id to Player-2 ").concat(args[args.length - 1]));
});
socketio.on('start', function (data) {
    game.id = data.id;
    game.board = data.gameboard;
    game.player = data.player;
    // console.log(game.id, game.board, game.player)
    keyToMove();
    updateBoard();
});
socketio.on('specstart', function (data) {
    // game.id = data.id;
    // game.board = data.gameboard;
    // game.player = data.player
    // // console.log(game.id, game.board, game.player)
    // // keyToMove()
    console.log(data.gameboard);
    //updateBoard()
});
socketio.on('failed', function () {
    console.log("Game ID not found. Please try again!!");
});
socketio.on('invalid', function () {
    console.log("Not a valid move !!");
});
socketio.on("updateGame", function (data) {
    // Update game and call updateGameboard()
    game.player.turn = !game.player.turn;
    game.board = data.gameboard;
    updateBoard();
});
socketio.on("win", function (data) {
    // Update game and call updateBoard()
    game.board = data;
    updateBoard();
    // Tell user they won and show remake button
    console.log("You won !!!!!!!!!!!!");
});
socketio.on("loss", function (data) {
    // Update game and call updateBoard()
    game.board = data;
    updateBoard();
    // Tell user they lost and show remake button
    console.log("You lost !!!!!!!!!!!!");
});
// Called when game has ended in a tie
socketio.on("tie", function (data) {
    // Update game and call updateBoard()
    game.board = data.gameboard;
    updateBoard();
    // Tell user they tied and show remake button
    console.log("Tie !!!!!!!!!!!!");
});
socketio.on("quit", function () {
    console.log("Please create a new game. Connection is lost");
});
socketio.on("roomsAvail", function (val) {
    //console.log(val.roomsArr)
    console.log("These are the room available. Please choose any one of the room to see the exciting match: ");
    var whichRooms = [
        {
            type: 'rawlist',
            name: 'modes',
            message: '(choose an option)',
            validate: function (answer) {
                if (!answer) {
                    return "Please, fill your choice!";
                }
                return true;
            },
            choices: val.roomsArr
        },
    ];
    inquirer.prompt(whichRooms).then(function (room) {
        console.log("You entered room number - ".concat(room["modes"]));
        //socketio.emit("updateGame")
        // console.log(playHistory)
        // socketio.emit('joinSpec', {gameID : +room["modes"]})
    });
});
function updateBoard() {
    printBoard();
    //let gameObj =  game.board;
    // Object.keys(gameObj).forEach((key) => {
    //   if (gameObj[key] == "X") {
    //         console.log("X")
    //       } 
    //   else {
    //         console.log("O")
    //       }
    // })
    console.log("\n");
    //console.log(game.player)
    if (game.player.turn) {
        console.log("Your turn");
        //keyToMove()
        // playHistory.push(game)
    }
    else {
        console.log("other player's turn");
        //keyToMove()
        // playHistory.push(game)
    }
}
function printBoard() {
    console.log('\n' +
        '  ' + game.board['0'] + ' | ' + game.board['1'] + ' | ' + game.board['2'] + '\n' +
        ' -------------\n' +
        '  ' + game.board['3'] + ' | ' + game.board['4'] + ' | ' + game.board['5'] + '\n' +
        ' -------------\n' +
        '  ' + game.board['6'] + ' | ' + game.board['7'] + ' | ' + game.board['8'] + '\n');
}
function keyToMove() {
    keypress(process.stdin);
    process.stdin.on('keypress', function (s, key) {
        // console.log(key.name)
        console.log(s);
        if (key && key.ctrl && key.name == 'c') {
            process.exit(1);
        }
        if (game.player.turn === true) {
            console.log("I pressed ".concat(s));
            if (game.board[s] === "") {
                var data = { id: game.id, cell: s, player: game.player };
                socketio.emit("move", data);
            }
            else {
                console.log("Please don't enter number outside (0-8) or the same number again");
            }
        }
        else {
            console.log("Please wait for the other player");
        }
    });
    process.stdin.setRawMode(true);
    process.stdin.resume();
}
// function keyPress(value) {
//   return new Promise((resolve, reject) => {
//     process.stdin.setRawMode(true);
//     process.stdin.once('data', keystroke => {
//       process.stdin.setRawMode(false);
//       if (keystroke[0] === value) return resolve();
//       return reject(Error('invalid keystroke'));
//     });
//   })
// }
