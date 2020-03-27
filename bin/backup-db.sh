#!/bin/bash

if [ ! -d "$SAGA_BACKUP_DIR" ]; then
    echo "Backup directory (SAGA_BACKUP_DIR=$SAGA_BACKUP_DIR) doesn't exist."
    exit 1
fi

# Current time
NOW="$(date +'%Y-%m-%d-%H-%M')"

# Backup file name
FILE_NAME=$SAGA_APP_NAME-$NOW.gz

echo "Backing up $SAGA_MONGO_URI to $SAGA_BACKUP_DIR/$FILE_NAME"

# Dump from mongodb host into backup directory
/usr/bin/mongodump --uri=$SAGA_MONGO_URI --gzip --archive=$SAGA_BACKUP_DIR/$FILE_NAME --verbose

# Create tar of backup directory
if [ $? != 0 ]; then
    echo "Error, unable to backup files"
    exit 1
fi

echo "Removing old backups..."
find $SAGA_BACKUP_DIR/ -name "*.gz" -mtime +7 -delete

echo "Backup: [done]"
