using NUnit.Framework;

namespace Appy.Services.SmartFiltering
{
    public class SmartFilterParserTests
    {
        [Test]
        public void ShouldThrow_WhenRootNotArray()
        {
            var filter = "{}";

            Assert.Throws<ArgumentException>(() => SmartFilterParser.Parse(filter));
        }

        [TestCase(@"[]")]
        [TestCase(@"[""a"", ""=="", ""3"", ""4""]")]
        [TestCase(@"[""a"", ""=="", 3, ""4""]")]
        [TestCase(@"[""a"", ""==""]")]
        public void ShouldThrow_WhenWrongNumberOfElements(string filter)
        {
            Assert.Throws<ArgumentException>(() => SmartFilterParser.Parse(filter));
        }

        [TestCase(@"[1, 2]")]
        [TestCase(@"[""not"", 2]")]
        [TestCase(@"[""not"", ""2""]")]
        [TestCase(@"[[], ""2""]")]
        [TestCase(@"[""not"", {}]")]
        public void ShouldThrow_WhenTwoElementsOfWrongType(string filter)
        {
            Assert.Throws<ArgumentException>(() => SmartFilterParser.Parse(filter));
        }

        [TestCase(@"[""nott"", [""a"", ""=="", 3]]")]
        [TestCase(@"["""", [""a"", ""=="", 3]]")]
        public void ShouldThrow_WhenTwoElementsWithWrongValues(string filter)
        {
            Assert.Throws<ArgumentException>(() => SmartFilterParser.Parse(filter));
        }

        [TestCase(@"[""a"", ""=="", {}]")]
        [TestCase(@"[""a"", ""=="", [""a"", ""=="", 3]]")]
        [TestCase(@"[""a"", 3, 3]")]
        [TestCase(@"[""a"", [""a"", ""=="", 3], 3]")]
        [TestCase(@"[""a"", {}, 3]")]
        [TestCase(@"[3, ""3"", 3]")]
        [TestCase(@"[[""a"", ""=="", 3], ""3"", 3]")]
        [TestCase(@"[{}, ""3"", 3]")]
        public void ShouldThrow_WhenThreeElementsOfWrongType(string filter)
        {
            Assert.Throws<ArgumentException>(() => SmartFilterParser.Parse(filter));
        }

        [TestCase(@"[""a"", ""="", ""3""]")]
        [TestCase(@"[""a"", """", ""3""]")]
        [TestCase(@"[""a"", ""="", 3]")]
        [TestCase(@"[""a"", """", 3]")]
        [TestCase(@"[[""a"", ""=="", 3], ""=="", [""a"", ""=="", 3]]")]
        [TestCase(@"[[""a"", ""=="", 3], """", [""a"", ""=="", 3]]")]
        public void ShouldThrow_WhenThreeElementsWithWrongValues(string filter)
        {
            Assert.Throws<ArgumentException>(() => SmartFilterParser.Parse(filter));
        }

        [Test]
        public void ShouldThrow_WhenComparatorContainsWithNumberValue()
        {
            var filter = @"[""a"", ""contains"", 3]";

            Assert.Throws<ArgumentException>(() => SmartFilterParser.Parse(filter));
        }

        [TestCase(Comparator.Equal)]
        [TestCase(Comparator.LessThan)]
        [TestCase(Comparator.GreaterThan)]
        [TestCase(Comparator.LessThanOrEqual)]
        [TestCase(Comparator.GreaterThanOrEqual)]
        [TestCase(Comparator.NotEquals)]
        //[TestCase(Comparator.Contains)] <- not allowed
        public void ShouldParseCorrectSmartFilter_WhenOnlyFieldFilter_WithNumber(Comparator comparator)
        {
            var propName = "a";
            var comparatorStr = SmartFilterParser.ComparatorToString(comparator);
            var value = 3;

            var filterJson = $"[\"{propName}\", \"{comparatorStr}\", {value}]";
            var expected = SmartFilter.FromFieldFilter(new FieldFilter(propName, comparator, value));

            var smartFilter = SmartFilterParser.Parse(filterJson);

            Assert.AreEqual(expected, smartFilter);
        }

        [TestCase(Comparator.Equal)]
        [TestCase(Comparator.LessThan)]
        [TestCase(Comparator.GreaterThan)]
        [TestCase(Comparator.LessThanOrEqual)]
        [TestCase(Comparator.GreaterThanOrEqual)]
        [TestCase(Comparator.NotEquals)]
        [TestCase(Comparator.Contains)]
        public void ShouldParseCorrectSmartFilter_WhenOnlyFieldFilter_WithString(Comparator comparator)
        {
            var propName = "a";
            var comparatorStr = SmartFilterParser.ComparatorToString(comparator);
            var value = "val";

            var filterJson = $"[\"{propName}\", \"{comparatorStr}\", \"{value}\"]";
            var expected = SmartFilter.FromFieldFilter(new FieldFilter(propName, comparator, value));

            var smartFilter = SmartFilterParser.Parse(filterJson);

            Assert.AreEqual(expected, smartFilter);
        }

        [TestCase(Comparator.GreaterThan)]
        [TestCase(Comparator.LessThan)]
        [TestCase(Comparator.GreaterThanOrEqual)]
        [TestCase(Comparator.LessThanOrEqual)]
        [TestCase(Comparator.Contains)]
        public void ShouldThrow_WhenWrongComparatorWithNullValue(Comparator comparator)
        {
            var comparatorStr = SmartFilterParser.ComparatorToString(comparator);
            var filter = $"[\"a\", \"{comparatorStr}\", null]";

            Assert.Throws<ArgumentException>(() => SmartFilterParser.Parse(filter));
        }

        [TestCase(Comparator.Equal)]
        [TestCase(Comparator.NotEquals)]
        // others are not allowed
        public void ShouldParseCorrectSmartFilter_WhenOnlyFieldFilter_WithNull(Comparator comparator)
        {
            var propName = "a";
            var comparatorStr = SmartFilterParser.ComparatorToString(comparator);

            var filterJson = $"[\"{propName}\", \"{comparatorStr}\", null]";
            var expected = SmartFilter.FromFieldFilter(new FieldFilter(propName, comparator, null));

            var smartFilter = SmartFilterParser.Parse(filterJson);

            Assert.AreEqual(expected, smartFilter);
        }

        [Test]
        public void ShouldParseCorrectSmartFilter_WhenNotOperator()
        {
            var propName = "a";
            var comparator = Comparator.Equal;
            var comparatorStr = SmartFilterParser.ComparatorToString(comparator);
            var value = "val";

            var filterJson = $"[\"not\", [\"{propName}\", \"{comparatorStr}\", \"{value}\"]]";
            var expected = SmartFilter.Not(SmartFilter.FromFieldFilter(new FieldFilter(propName, comparator, value)));

            var smartFilter = SmartFilterParser.Parse(filterJson);

            Assert.AreEqual(expected, smartFilter);
        }

        [Test]
        public void ShouldParseCorrectSmartFilter_WhenAndOperator()
        {
            var propName1 = "a";
            var propName2 = "b";
            var comparator1 = Comparator.Equal;
            var comparator2 = Comparator.Contains;
            var comparatorStr1 = SmartFilterParser.ComparatorToString(comparator1);
            var comparatorStr2 = SmartFilterParser.ComparatorToString(comparator2);
            var value1 = "val";
            var value2 = "ffs";

            var filterJson = 
                $"[[\"{propName1}\", \"{comparatorStr1}\", \"{value1}\"], " +
                    $"\"and\", " +
                $"[\"{propName2}\", \"{comparatorStr2}\", \"{value2}\"]]";
            var expected = SmartFilter.And(
                SmartFilter.FromFieldFilter(new FieldFilter(propName1, comparator1, value1)),
                SmartFilter.FromFieldFilter(new FieldFilter(propName2, comparator2, value2)));

            var smartFilter = SmartFilterParser.Parse(filterJson);

            Assert.AreEqual(expected, smartFilter);
        }

        [Test]
        public void ShouldParseCorrectSmartFilter_WhenOrOperator()
        {
            var propName1 = "a";
            var propName2 = "b";
            var comparator1 = Comparator.Equal;
            var comparator2 = Comparator.Contains;
            var comparatorStr1 = SmartFilterParser.ComparatorToString(comparator1);
            var comparatorStr2 = SmartFilterParser.ComparatorToString(comparator2);
            var value1 = "val";
            var value2 = "ffs";

            var filterJson =
                $"[[\"{propName1}\", \"{comparatorStr1}\", \"{value1}\"], " +
                    $"\"or\", " +
                $"[\"{propName2}\", \"{comparatorStr2}\", \"{value2}\"]]";
            var expected = SmartFilter.Or(
                SmartFilter.FromFieldFilter(new FieldFilter(propName1, comparator1, value1)),
                SmartFilter.FromFieldFilter(new FieldFilter(propName2, comparator2, value2)));

            var smartFilter = SmartFilterParser.Parse(filterJson);

            Assert.AreEqual(expected, smartFilter);
        }
    }
}
