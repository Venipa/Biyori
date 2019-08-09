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
    [SettingsRoute("application", "Application", true)]
    /// <summary>
    /// Interaction logic for SettingsPage_Application.xaml
    /// </summary>
    public partial class SettingsPage_Application : Page
    {
        public SettingsPage_Application()
        {
            InitializeComponent();
        }
    }
}
