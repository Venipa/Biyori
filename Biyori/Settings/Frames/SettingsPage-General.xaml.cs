using PropertyChanged;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;

namespace Biyori.Settings.Frames
{
    [AddINotifyPropertyChangedInterface]
    [SettingsRoute("services", "Services", true)]
    /// <summary>
    /// Interaction logic for SettingsPage_General.xaml
    /// </summary>
    public partial class SettingsPage_General : Page
    {
        public SettingsPage_General()
        {
            InitializeComponent();
        }
    }
}
