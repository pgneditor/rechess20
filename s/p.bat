echo off

call git pull github master

call s\ver

call s\c %1

git push github master

git push gitlab master

git push heroku master
