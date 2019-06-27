FROM node:8-alpine as builder

RUN mkdir -p /ace-service

WORKDIR /ace-service

# Copy necessary files
ADD . /ace-service

# Create non-root user and make owner to all files in ace-service directory
RUN addgroup -S axway && \
    adduser -S -G axway axway && \
    npm install && \
    chown -R axway:axway /ace-service

FROM node:8-alpine

COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /ace-service /ace-service

WORKDIR /ace-service

USER axway

ENTRYPOINT ["npm", "start"]
EXPOSE 50006
