using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Controls;

namespace Biyori.Lib.Controls
{
    public class CardControl : ContentControl
    {
        static CardControl()
        {
            DefaultStyleKeyProperty.OverrideMetadata(typeof(CardControl),
                       new System.Windows.FrameworkPropertyMetadata(typeof(CardControl)));
        }

    }
}
