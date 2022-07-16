namespace Appy.Exceptions
{
    public class ValidationException : Exception
    {
        public string PropertyName { get; private set; }
        public string ErrorCode { get; private set; }

        public ValidationException(string errorCode) : base($"Validation exception {errorCode}.")
        {
            this.PropertyName = "other";
            this.ErrorCode = errorCode;
        }

        public ValidationException(string propertyName, string errorCode) : base($"Validation exception {errorCode} on property {propertyName}.")
        {
            this.PropertyName = propertyName;
            this.ErrorCode = errorCode;
        }
    }
}
