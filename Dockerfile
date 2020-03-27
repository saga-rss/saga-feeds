FROM node:10.16.3

# get latest version of mongo installed, for running backups
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4
RUN echo "deb http://repo.mongodb.org/apt/debian stretch/mongodb-org/4.0 main" | tee "/etc/apt/sources.list.d/mongodb-org.list"

# update package cache
RUN apt-get update

# install mongodb tools
RUN apt-get install mongodb-org-tools -y

COPY etc/default/development.env /etc/default/

RUN yarn global add pm2

RUN mkdir /opt/app && chown node:node /opt/app
RUN mkdir /opt/app_backups && chown node:node /opt/app_backups

USER node

WORKDIR /opt/app

COPY --chown=node:node package.json ./
COPY --chown=node:node yarn.lock ./

RUN yarn install

COPY . .

EXPOSE 8080

# Run process via pm2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
