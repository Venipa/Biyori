; userData moved to %APPDATA%\venipa.net\biyori; deleteAppDataOnUninstall only covers %APPDATA%\${PRODUCT_NAME}
!macro customUnInstall
  ${ifNot} ${isUpdated}
    SetShellVarContext current
    RMDir /r "$APPDATA\venipa.net\biyori"
    ; only removes the org folder when nothing else lives there
    RMDir "$APPDATA\venipa.net"
  ${endIf}
!macroend
