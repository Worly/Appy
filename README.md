## Local dev setup
```
dotnet user-secrets set "JwtSecret" "<any-local-secret>" --project Appy
dotnet user-secrets set "ConnectionStrings:Main" "Server=localhost;Port=5432;Database=Appy;Userid=AppyUser;Password=<password>" --project Appy
```
