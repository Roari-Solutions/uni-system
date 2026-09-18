#!/bin/bash
# Grades/curriculum/student endpoint tests. Server must be up.
# Usage: ./api_gr_test.sh [base_url]  (default from backend/.env PORT, fallback 4000)
ENV_PORT=$(grep -E '^PORT=[0-9]+' "$(dirname "$0")/backend/.env" 2>/dev/null | cut -d= -f2)
B=${1:-${BASE_URL:-http://localhost:${ENV_PORT:-4000}/api/v1}}
JA=/tmp/gr-admin.txt; JE=/tmp/gr-entry.txt; JU=/tmp/gr-user.txt
rm -f $JA $JE $JU
PASS=0; FAIL=0
RUN=$(date +%s)
C1="Curr$RUN"; C2="CurrB$RUN"; C3="CurrC$RUN"
U1="U$RUN"; U2="V$RUN"

hit() { # method path jar [json] -> prints body newline code
  local m=$1 p=$2 j=$3 d=$4
  if [ -n "$d" ]; then
    curl -s -w '\n%{http_code}' -b "$j" -X "$m" "$B$p" -H 'Content-Type: application/json' -d "$d"
  else
    curl -s -w '\n%{http_code}' -b "$j" -X "$m" "$B$p"
  fi
}
expect() { # label want_code got_output
  local label=$1 want=$2 out=$3
  local code=$(echo "$out" | tail -n1)
  local body=$(echo "$out" | head -n -1)
  if [ "$code" = "$want" ]; then PASS=$((PASS+1)); echo "PASS $label ($code)";
  else FAIL=$((FAIL+1)); echo "FAIL $label (want $want got $code) $body"; fi
}
contains() { # label needle got_output
  local label=$1 needle=$2 out=$3
  if echo "$out" | grep -q "$needle"; then PASS=$((PASS+1)); echo "PASS $label";
  else FAIL=$((FAIL+1)); echo "FAIL $label (missing '$needle') $(echo "$out" | head -n -1)"; fi
}

echo "=== login ($B) ==="
login() { # jar email
  local code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -c "$1" -X POST $B/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$2\",\"password\":\"secret123\"}")
  if [ "$code" != "200" ]; then echo "FATAL: login failed for $2 (HTTP $code) — is the server up at $B and seeded?"; exit 1; fi
}
login $JA test-admin
login $JE test-entry
login $JU test-testuser
echo "logins ok"

echo "=== guards ==="
expect "gr no cookie"            401 "$(hit GET /gr /dev/null)"
expect "students no cookie"      401 "$(hit GET /gr/students /dev/null)"
expect "curriculum no cookie"    401 "$(hit GET /gr/curriculum /dev/null)"
expect "gr wrong role"           401 "$(hit GET /gr $JU)"
expect "gr entry ok"             200 "$(hit GET /gr $JE)"
expect "gr admin ok"             200 "$(hit GET /gr $JA)"

echo "=== curriculum (admin) ==="
expect "create curriculum"       201 "$(hit POST /gr/curriculum $JA "{\"name\":\"$C1\",\"year\":\"2026\",\"abbreviation\":\"$C1\",\"faculty\":\"Engineering\"}")"
expect "create dup -> 409"       409 "$(hit POST /gr/curriculum $JA "{\"name\":\"$C1\",\"year\":\"2026\",\"abbreviation\":\"$C1\",\"faculty\":\"Engineering\"}")"
expect "missing field -> 400"    400 "$(hit POST /gr/curriculum $JA "{\"name\":\"X$RUN\",\"year\":\"2026\",\"faculty\":\"Engineering\"}")"
expect "unknown faculty -> 400"  400 "$(hit POST /gr/curriculum $JA "{\"name\":\"X$RUN\",\"year\":\"2026\",\"abbreviation\":\"X$RUN\",\"faculty\":\"Nope\"}")"
contains "list has $C1"          "$C1" "$(hit GET /gr/curriculum $JA)"
expect "update curriculum"       200 "$(hit PATCH /gr/curriculum/$C1/Engineering $JA "{\"abbreviation\":\"${C1}N\"}")"
expect "update empty -> 400"     400 "$(hit PATCH /gr/curriculum/$C1/Engineering $JA "{}")"
expect "update miss -> 404"      404 "$(hit PATCH /gr/curriculum/Nope$RUN/Engineering $JA "{\"abbreviation\":\"Z\"}")"
expect "entry other fac -> 401"  401 "$(hit POST /gr/curriculum $JE "{\"name\":\"M$RUN\",\"year\":\"2026\",\"abbreviation\":\"M$RUN\",\"faculty\":\"Medicine\"}")"
expect "entry own fac -> 201"    201 "$(hit POST /gr/curriculum $JE "{\"name\":\"$C2\",\"year\":\"2026\",\"abbreviation\":\"$C2\",\"faculty\":\"Engineering\"}")"
expect "entry delete own"        200 "$(hit DELETE /gr/curriculum/$C2/Engineering $JE)"
expect "delete miss -> 404"      404 "$(hit DELETE /gr/curriculum/Nope$RUN/Engineering $JA)"

echo "=== students (admin) ==="
expect "create student"          201 "$(hit POST /gr/students $JA "{\"name\":\"S1\",\"year\":\"2024\",\"uniNo\":\"$U1\",\"acceptanceType\":\"general\",\"faculty\":\"Engineering\"}")"
expect "create dup -> 409"       409 "$(hit POST /gr/students $JA "{\"name\":\"S1\",\"year\":\"2024\",\"uniNo\":\"$U1\",\"acceptanceType\":\"general\",\"faculty\":\"Engineering\"}")"
expect "missing field -> 400"    400 "$(hit POST /gr/students $JA "{\"year\":\"2024\",\"uniNo\":\"X$RUN\",\"acceptanceType\":\"general\",\"faculty\":\"Engineering\"}")"
expect "unknown faculty -> 400"  400 "$(hit POST /gr/students $JA "{\"name\":\"S\",\"year\":\"2024\",\"uniNo\":\"X$RUN\",\"acceptanceType\":\"general\",\"faculty\":\"Nope\"}")"
contains "list has $U1"          "$U1" "$(hit GET /gr/students $JA)"
contains "student has academicYear" '"academicYear":"2024"' "$(hit GET /gr/students $JA)"
expect "update student"          200 "$(hit PATCH /gr/students/$U1 $JA "{\"name\":\"S1b\"}")"
expect "update year"              200 "$(hit PATCH /gr/students/$U1 $JA "{\"year\":\"2025\"}")"
contains "academicYear updated"   '"academicYear":"2025"' "$(hit GET /gr/students $JA)"
expect "change uniNo -> 400"     400 "$(hit PATCH /gr/students/$U1 $JA "{\"uniNo\":\"OTHER\"}")"
expect "update empty -> 400"     400 "$(hit PATCH /gr/students/$U1 $JA "{}")"
expect "update miss -> 404"      404 "$(hit PATCH /gr/students/NOPE$RUN $JA "{\"name\":\"Z\"}")"
expect "create med student"      201 "$(hit POST /gr/students $JA "{\"name\":\"S2\",\"year\":\"2024\",\"uniNo\":\"$U2\",\"acceptanceType\":\"general\",\"faculty\":\"Medicine\"}")"
expect "entry x-fac patch -> 401" 401 "$(hit PATCH /gr/students/$U2 $JE "{\"name\":\"Hax\"}")"

echo "=== grades (admin) ==="
expect "create curriculum $C3"   201 "$(hit POST /gr/curriculum $JA "{\"name\":\"$C3\",\"year\":\"2026\",\"abbreviation\":\"$C3\",\"faculty\":\"Engineering\"}")"
expect "create grade"            201 "$(hit POST /gr $JA "{\"uniNo\":\"$U1\",\"curriculum\":\"$C3\",\"grade\":85,\"year\":\"2026\"}")"
expect "grade dup -> 409"        409 "$(hit POST /gr $JA "{\"uniNo\":\"$U1\",\"curriculum\":\"$C3\",\"grade\":85,\"year\":\"2026\"}")"
expect "unknown student -> 400"  400 "$(hit POST /gr $JA "{\"uniNo\":\"NOPE$RUN\",\"curriculum\":\"$C3\",\"grade\":85,\"year\":\"2026\"}")"
expect "missing grade -> 400"    400 "$(hit POST /gr $JA "{\"uniNo\":\"$U1\",\"curriculum\":\"$C3\",\"year\":\"2026\"}")"
contains "list has $U1"          "$U1" "$(hit GET /gr $JA)"
expect "update grade"            200 "$(hit PATCH /gr/$U1 $JA "{\"grade\":90,\"curriculum\":\"$C3\",\"year\":\"2026\"}")"
expect "update empty -> 400"     400 "$(hit PATCH /gr/$U1 $JA "{}")"
expect "update miss -> 404"      404 "$(hit PATCH /gr/NOPE$RUN $JA "{\"grade\":90}")"
expect "entry x-fac grade -> 401" 401 "$(hit POST /gr $JE "{\"uniNo\":\"$U2\",\"curriculum\":\"$C3\",\"grade\":70,\"year\":\"2026\"}")"
expect "delete one grade"        200 "$(hit DELETE /gr/$U1 $JA "{\"curriculum\":\"$C3\",\"year\":\"2026\"}")"
expect "recreate s1+s2 terms"    201 "$(hit POST /gr $JA "{\"uniNo\":\"$U1\",\"curriculum\":\"$C3\",\"grade\":80,\"year\":\"2026\",\"semester\":\"1\"}")"
expect "second term"             201 "$(hit POST /gr $JA "{\"uniNo\":\"$U1\",\"curriculum\":\"$C3\",\"grade\":82,\"year\":\"2026\",\"semester\":\"2\"}")"
out=$(hit DELETE /gr/all/$U1 $JA)
expect "delete all grades"       200 "$out"
contains "delete all returns Ok" '"status":"Ok"' "$out"
expect "delete all miss -> 404"  404 "$(hit DELETE /gr/all/NOPE$RUN $JA)"
expect "delete one miss -> 404"  404 "$(hit DELETE /gr/NOPE$RUN $JA '{}')"

echo "=== students delete ==="
expect "delete $U1"              200 "$(hit DELETE /gr/students/$U1 $JA)"
expect "delete again -> 404"     404 "$(hit DELETE /gr/students/$U1 $JA)"
expect "delete $U2"              200 "$(hit DELETE /gr/students/$U2 $JA)"

echo "=== curriculum delete ==="
expect "delete $C1"              200 "$(hit DELETE /gr/curriculum/$C1/Engineering $JA)"
expect "delete $C3"              200 "$(hit DELETE /gr/curriculum/$C3/Engineering $JA)"
expect "delete again -> 404"     404 "$(hit DELETE /gr/curriculum/$C1/Engineering $JA)"

echo; echo "PASS=$PASS FAIL=$FAIL"
