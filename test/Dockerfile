FROM node:18-alpine AS webpod
RUN apk add \
    git \
    openssh-client
RUN ssh-keygen -q -t ed25519 -C "test@webpod.dev" -f /root/.ssh/id_rsa
RUN git config --global user.email "test@webpod.dev"; \
    git config --global user.name "webpod"
VOLUME /webpod
WORKDIR /webpod

FROM ubuntu:22.04 AS remote-host
RUN apt-get update && apt-get install -y \
    acl \
    openssh-server \
    sudo
RUN mkdir /run/sshd
COPY --from=webpod /root/.ssh/id_rsa.pub /root/.ssh/authorized_keys
EXPOSE 22 80
CMD ["/usr/sbin/sshd", "-D"]
