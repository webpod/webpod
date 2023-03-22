ARG node=18
FROM node:${node}-alpine AS webpod
RUN apk add \
    openssh-client
RUN adduser -D -u 1001 webpod
USER webpod
RUN ssh-keygen -q -t ed25519 -C "hi@webpod.dev" -f /home/webpod/.ssh/id_rsa
VOLUME /webpod
WORKDIR /webpod

FROM ubuntu:22.04 AS remote-host
RUN apt-get update && apt-get install -y \
    acl \
    openssh-server \
    sudo
RUN mkdir /run/sshd
COPY --from=webpod /home/webpod/.ssh/id_rsa.pub /root/.ssh/authorized_keys
RUN chown root:root /root/.ssh/authorized_keys
EXPOSE 22 80
CMD ["/usr/sbin/sshd", "-D"]
