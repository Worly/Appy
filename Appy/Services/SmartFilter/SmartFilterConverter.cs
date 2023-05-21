﻿using System.ComponentModel;
using System.Globalization;

namespace Appy.Services.SmartFiltering
{
    public class SmartFilterConverter : TypeConverter
    {
        public override bool CanConvertFrom(ITypeDescriptorContext? context, Type sourceType)
        {
            if (sourceType == typeof(string))
            {
                return true;
            }

            return base.CanConvertFrom(context, sourceType);
        }

        public override object? ConvertFrom(ITypeDescriptorContext? context, CultureInfo? culture, object value)
        {
            if (value is string json)
            {
                return SmartFilterParser.Parse(json);
            }

            return base.ConvertFrom(context, culture, value);
        }
    }
}
