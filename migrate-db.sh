if [ "$#" -lt 1 ]; then
  docker exec -t viernulvier-backend pnpm run migrate
else
  docker exec -t viernulvier-backend pnpm run migrate "$1"
fi
