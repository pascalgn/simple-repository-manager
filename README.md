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
        <url>http://localhost:3000/repository/</url>
    </repository>
</distributionManagement>
```

Then run `mvn deploy` to deploy the project.

### Configuration

See [example-config.yaml](example-config.yaml)

## License

[MIT](LICENSE)
