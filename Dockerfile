# Dockerfile to build the getapp application
# to fit the prod environmet in the cts

############################################################
###               ///    CTS part     ///                ###
############################################################
FROM node:19.5.0-alpine as cts

WORKDIR /node-app

# ===   create a uid and a gid to fit CTS project uid === #
ARG uid=1004370000
ARG username=getapp
# Add the user to /etc/passwd
RUN echo "${username}:x:${uid}:${uid}:${username}:/home/${username}:/sbin/nologin" >> /etc/passwd
# Add the user to /etc/group
RUN echo "${username}:x:${uid}:" 

# ===   install ca sofeware === #
# Install the ca-certificates package to manage certificates
RUN apk --no-cache add ca-certificates bash curl
# Create the CA certificates directory
RUN mkdir -p /usr/local/share/ca-certificates/

# ===   inside part - must be run inside in the CTS   === #
# Update the CA certificates bundle inside the container
# inside the CTS build the image only with these two lines, ant commit all the rest.
# COPY idfcts/* /usr/local/share/ca-certificates/
# RUN update-ca-certificates

# # copt the app files
RUN chown -R ${uid}:${uid} /node-app
# COPY --chown=${uid}:${uid} . .

# # inside the CTS the privios command wont work. so if for some resion you need to run this command inside the cts - you need to use these 2 commands insted.
# # COPY . .
# # RUN chown -R ${uid}:${uid} /node-app
ENV CI=true


############################################################
###               ///       end      ///                 ###
############################################################

# using a alpine image - lite as posible
FROM node:19.5.0-alpine as build
# some of the commands can't be executed if the user is not root
USER root
# hear the files of the app are stored.
WORKDIR /node-app
COPY package*.json ./
RUN npm i
COPY . .
# test stage
# RUN npm run test
# build
RUN npm run build


FROM cts as deploy
ARG deploy_version_tag
ENV deploy_version_tag=$deploy_version_tag


ENV NODE_ENV=production

ARG uid=1004370000
ARG username=getapp

COPY --chown=${uid}:${uid} package*.json ./

RUN npm install --only=production --omit=dev

COPY --chown=${uid}:${uid} --from=build /node-app/dist/ .

RUN echo "$deploy_version_tag" > NEW_TAG.txt 
# a file that contains the image version
# COPY docker_image_version.txt /docker_image_version.txt
# RUN cat docker_image_version.txt

USER ${username}
CMD ["node", "apps/deploy/main.js"]
