FROM public.ecr.aws/docker/library/maven:3.9-amazoncorretto-20 as build

WORKDIR /workdir
COPY pom.xml .
RUN mvn dependency:resolve-plugins dependency:resolve
COPY src/ ./src/
RUN mvn test package

# --------
FROM public.ecr.aws/amazoncorretto/amazoncorretto:20

COPY --from=build /workdir/target/*.jar /app.jar
ENTRYPOINT [ "java", "-jar", "/app.jar" ]