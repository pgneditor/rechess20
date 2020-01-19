call node refactor.js %1 %2
pause
call node gitlab.js createrepo %2
pause
call s\init
call node herokuapi.js deleteapp
pause
call node herokuapi.js createapp
pause
call node herokuapi.js setall
git add .
git commit -m "Initial commit"
pause
git push github master
git push gitlab master
git push heroku master
pause
call node gitlab.js deleterepo %1
