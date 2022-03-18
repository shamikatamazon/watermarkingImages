#aws cloudformation deploy --template-file deployCode.yaml --stack-name watermarkingCode --capabilities CAPABILITY_IAM

zip -r function.zip .

aws s3api put-object --bucket watermarklambdacode67 --key WatermarkFunctionCode --region us-east-1 --body function.zip
rm function.zip

#aws lambda publish-version --function-name WaterMarkImageFunction

aws cloudformation deploy --template-file deployLambda.yaml --stack-name watermarking --capabilities CAPABILITY_NAMED_IAM
aws lambda update-function-code --function-name WaterMarkImageFunction --s3-bucket watermarklambdacode67 --s3-key WatermarkFunctionCode