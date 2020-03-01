FROM node:10.16.3

RUN yarn global add pm2

RUN mkdir /opt/app && chown node:node /opt/app

USER node

WORKDIR /opt/app

COPY --chown=node:node package.json ./

RUN yarn install

COPY . .

# Run process via pm2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
