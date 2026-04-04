Set-Location backend/tab1-social/

npm ci --omit=dev

Get-ChildItem -Exclude docs,scripts,deploy.zip,.env*,.git* | Compress-Archive -DestinationPath deploy.zip -Force

Remove-Item Env:\AWS_ACCESS_KEY_ID -ErrorAction SilentlyContinue
Remove-Item Env:\AWS_SECRET_ACCESS_KEY -ErrorAction SilentlyContinue
Remove-Item Env:\AWS_SESSION_TOKEN -ErrorAction SilentlyContinue

aws lambda update-function-code --function-name NITRHUB --zip-file fileb://deploy.zip --region ap-south-1

Remove-Item deploy.zip -Force

