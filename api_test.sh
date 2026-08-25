#!/bin/bash
B=http://localhost:4000/api/v1
J=/tmp/cookies.txt
rm -f $J

t() { echo "--- $1"; shift; "$@"; echo; }

t "GET / (root no prefix -> 404?)" curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4000/
t "GET /api/v1" curl -s -w '\n%{http_code}\n' $B

t "login: missing body"      curl -s -w '\n%{http_code}\n' -X POST $B/auth/login -H 'Content-Type: application/json'
t "login: missing password"  curl -s -w '\n%{http_code}\n' -X POST $B/auth/login -H 'Content-Type: application/json' -d '{"email":"test-testuser"}'
t "login: extra field"       curl -s -w '\n%{http_code}\n' -X POST $B/auth/login -H 'Content-Type: application/json' -d '{"email":"test-testuser","password":"secret123","hack":1}'
t "login: wrong email"       curl -s -w '\n%{http_code}\n' -X POST $B/auth/login -H 'Content-Type: application/json' -d '{"email":"nope@x.com","password":"secret123"}'
t "login: wrong password"    curl -s -w '\n%{http_code}\n' -X POST $B/auth/login -H 'Content-Type: application/json' -d '{"email":"test-testuser","password":"wrong"}'
t "login: OK"                curl -s -c $J -w '\n%{http_code}\n' -X POST $B/auth/login -H 'Content-Type: application/json' -d '{"email":"test-testuser","password":"secret123"}'

t "me: no cookie"     curl -s -w '\n%{http_code}\n' $B/auth/me
t "me: bad token"     curl -s -w '\n%{http_code}\n' -b 'access_token=garbage' $B/auth/me
t "me: OK"            curl -s -b $J -w '\n%{http_code}\n' $B/auth/me

t "refresh: no cookie"  curl -s -w '\n%{http_code}\n' $B/auth/refresh
t "refresh: bad token"  curl -s -w '\n%{http_code}\n' -b 'refresh_token=garbage' $B/auth/refresh
t "refresh: OK"         curl -s -c $J -b $J -w '\n%{http_code}\n' $B/auth/refresh

# content unauth
t "news: no auth"      curl -s -w '\n%{http_code}\n' $B/content/news
t "news: bad token"    curl -s -w '\n%{http_code}\n' -b 'access_token=garbage' $B/content/news

# authed news CRUD
t "news: list empty"        curl -s -b $J -w '\n%{http_code}\n' $B/content/news
t "news: create OK"         curl -s -b $J -w '\n%{http_code}\n' -X POST $B/content/news -H 'Content-Type: application/json' -d '{"title":"hello","content":"world"}'
t "news: create missing content" curl -s -b $J -w '\n%{http_code}\n' -X POST $B/content/news -H 'Content-Type: application/json' -d '{"title":"x"}'
t "news: create extra field" curl -s -b $J -w '\n%{http_code}\n' -X POST $B/content/news -H 'Content-Type: application/json' -d '{"title":"x","content":"y","zzz":1}'
t "news: get by title hit"  curl -s -b $J -w '\n%{http_code}\n' $B/content/news/hello
t "news: get by title miss" curl -s -b $J -w '\n%{http_code}\n' $B/content/news/nope
t "news: update OK"         curl -s -b $J -w '\n%{http_code}\n' -X PATCH $B/content/news/hello -H 'Content-Type: application/json' -d '{"content":"updated"}'
t "news: update miss"       curl -s -b $J -w '\n%{http_code}\n' -X PATCH $B/content/news/nope -H 'Content-Type: application/json' -d '{"content":"x"}'
t "news: update empty body" curl -s -b $J -w '\n%{http_code}\n' -X PATCH $B/content/news/hello -H 'Content-Type: application/json' -d '{}'
t "news: list after"        curl -s -b $J -w '\n%{http_code}\n' $B/content/news
t "news: delete miss"       curl -s -b $J -o /dev/null -w '%{http_code}\n' -X DELETE $B/content/news/nope
t "news: delete OK"         curl -s -b $J -w '\n%{http_code}\n' -X DELETE $B/content/news/hello
t "news: get after delete"  curl -s -b $J -w '\n%{http_code}\n' $B/content/news/hello

# contacts
t "contact: list"            curl -s -b $J -w '\n%{http_code}\n' $B/content/contact
t "contact: create OK"       curl -s -b $J -w '\n%{http_code}\n' -X POST $B/content/contact -H 'Content-Type: application/json' -d '{"name":"email","value":"a@b.c","iconName":"mail"}'
t "contact: create missing icon" curl -s -b $J -w '\n%{http_code}\n' -X POST $B/content/contact -H 'Content-Type: application/json' -d '{"name":"x","value":"y"}'
t "contact: update OK"       curl -s -b $J -w '\n%{http_code}\n' -X PATCH $B/content/contact/email -H 'Content-Type: application/json' -d '{"name":"email","value":"new@b.c","iconName":"mail"}'
t "contact: update miss"     curl -s -b $J -w '\n%{http_code}\n' -X PATCH $B/content/contact/nope -H 'Content-Type: application/json' -d '{"name":"x","value":"y","iconName":"z"}'
t "contact: list after"      curl -s -b $J -w '\n%{http_code}\n' $B/content/contact
t "contact: delete OK"       curl -s -b $J -o /dev/null -w '%{http_code}\n' -X DELETE $B/content/contact/email
t "contact: delete miss"     curl -s -b $J -o /dev/null -w '%{http_code}\n' -X DELETE $B/content/contact/email
