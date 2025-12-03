FROM nginx:1.27-alpine

RUN apk add --no-cache bash gettext

COPY web /usr/share/nginx/html
COPY docker/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 80
CMD ["/entrypoint.sh"]
