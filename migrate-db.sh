if [ "$#" -lt 1 ]; then
  docker exec -t viernulvier-backend pnpm run migrate
fi

docker exec -t viernulvier-backend pnpm run migrate "$1"
