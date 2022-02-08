# tic-tac-toe-cli-typescript

steps to follow - 

to run locally - 

1. npm i
2. configure ts-node globally
3. ts-node .\server.ts for server
4. cd .\client\
5. ts-node .\clientexp.ts -address http://localhost:8000 -name Addy [use 8000 port for local]


to run in docker - 

1. npm i
2. configure ts-node globally
3. for server
    a. docker build -t tic-tac-toe-cli-online .
    b. docker run -it -p 9000:8000 tic-tac-toe-cli-online [9000 port is used as prod]
4. for client - ts-node .\clientexp.ts -address http://localhost:9000 -name Addy [use 9000 port here for docker]
5. repeat step.4 for playing multiplayer
