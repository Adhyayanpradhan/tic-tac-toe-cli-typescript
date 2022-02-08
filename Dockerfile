FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /server
COPY package.json /server/
RUN npm install --production --silent && mv node_modules ../
COPY . /server
CMD ["npm", "start"]
