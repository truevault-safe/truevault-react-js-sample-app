#!/bin/sh

export PGPASSWORD=password

PSQL="${PSQL:=psql} -h 127.0.0.1 -p 5432"

$PSQL -U postgres -d postgres <<SQL
DROP DATABASE IF EXISTS tv_sample_app;
DROP USER IF EXISTS tv_sample_app_dev;
CREATE USER tv_sample_app_dev PASSWORD 'secret';
CREATE DATABASE tv_sample_app WITH OWNER tv_sample_app_dev;
SQL

export PGPASSWORD=secret

for f in db-migrations/*
do
    $PSQL -U tv_sample_app_dev -d tv_sample_app < $f
done
