FROM ubuntu:20.04

RUN apt-get update && apt-get install -y openssh-server

RUN mkdir /var/run/sshd

RUN sed 's@#PermitRootLogin prohibit-password@PermitRootLogin yes@g' -i /etc/ssh/sshd_config

# SSH login fix. Otherwise user gets kicked off after login
RUN sed 's@session\s*required\s*pam_loginuid.so@session optional pam_loginuid.so@g' -i /etc/pam.d/sshd

# Setting environment variable for not being kicked off
ENV NOTVISIBLE "in users profile"
RUN echo "export VISIBLE=now" >> /etc/profile

RUN mkdir -p /root/.ssh

# Copying the local key to the authorized keys
COPY ./id_rsa.pub /root/.ssh/authorized_keys

# Giving permissions to the authorized keys file
RUN chmod 600 /root/.ssh/authorized_keys

# Exposing the SSH port
EXPOSE 22

# Starting sshd
CMD ["/usr/sbin/sshd", "-D"]
