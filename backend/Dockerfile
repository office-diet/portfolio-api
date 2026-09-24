FROM node:20

ENV TZ=Asia/Tokyo

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

RUN npm run build

CMD ["node", "dist/index.js"]
