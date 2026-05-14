FROM node:20-alpine

WORKDIR /app

ENV EXPO_NO_TELEMETRY=1

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 8081 19000 19001 19002

CMD ["sh", "-c", "npm install && npx expo start --host lan --clear"]
