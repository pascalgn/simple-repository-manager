# simple-repository-manager

Simple Maven repository manager.

## Usage

To run the repository manager using Docker:

```
docker run --rm -p 3000:3000 pascalgn/simple-repository-manager
```

To use it in a project, configure the server in your `pom.xml`:

```xml
<distributionManagement>
    <repository>
        <id>test</id>
        <url>http://localhost:3000/</url>
    </repository>
</distributionManagement>
```

Then run `mvn deploy` to deploy the project.

### Environment variables

- `NODE_ENV` - set to `dev` to enable debug logs
- `PORT` - the network port to listen on
- `REPOSITORY` - the path where the repository will be stored

## License

[MIT](LICENSE)
